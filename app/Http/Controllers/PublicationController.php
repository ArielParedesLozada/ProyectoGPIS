<?php

namespace App\Http\Controllers;

use App\Enums\StatusType;
use App\Enums\PublicationType;
use App\Models\Category;
use App\Models\Publication;
use App\Models\PublicationImage;
use App\Models\ModerationCase;
use App\Models\ModerationReport;
use App\Models\ModerationAppeal;
use App\Models\ModerationAction;
use App\Models\User;
use App\Services\GeocodingService;
use App\Services\ProfanityService;
use App\Exceptions\ProfanityDetectedException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Clickbar\Magellan\Data\Geometries\Point;

class PublicationController extends Controller
{
    public function index(Request $request)
    {
        $query = Publication::query()->with(['category', 'images']);
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }
        
        // Filtro por distancia geográfica
        if ($request->filled('near_lat') && $request->filled('near_lng') && $request->filled('radius_km')) {
            $lat = $request->near_lat;
            $lng = $request->near_lng;
            $radiusKm = $request->radius_km;
            
            $query->whereRaw(
                "ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)",
                [$lng, $lat, $radiusKm * 1000] // Convertir km a metros
            );
        }
        
        $query->where('status', StatusType::HABILITADO)
              ->where('is_hidden', false);

        $publications = $query->paginate(6)->withQueryString();

        $categories = Category::select('id', 'name')->get();

        return Inertia::render('publications/publication-index', [
            'publications' => $publications,
            'categories' => $categories,
            'selectedCategory' => $request->category_id,
            'selectedType' => $request->type,
            'selectedMinPrice' => $request->min_price,
            'selectedMaxPrice' => $request->max_price,
            'nearLat' => $request->near_lat,
            'nearLng' => $request->near_lng,
            'radiusKm' => $request->radius_km,
        ]);
    }

    public function myPublications(Request $request)
    {
        $userId = Auth::id();
        
        if (!$userId) {
            return redirect()->route('login');
        }
        
        try {
            $query = Publication::query()
                ->with(['category', 'images', 'moderationCases' => function($query) {
                    $query->where('status', 'closed')
                          ->with(['actions' => function($actionQuery) {
                              $actionQuery->where('action_type', 'hide_publication')
                                         ->orderBy('created_at', 'desc')
                                         ->limit(1);
                          }]);
                }])
                ->where('created_by', $userId);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $publications = $query->orderBy('created_at', 'desc')->paginate(9)->withQueryString();
            
            // Agregar información de moderación a cada publicación
            $publications->getCollection()->transform(function ($publication) {
                if ($publication->is_hidden && $publication->moderationCases->isNotEmpty()) {
                    $latestCase = $publication->moderationCases->first();
                    $hideAction = $latestCase->actions->first();
                    
                    if ($hideAction && isset($hideAction->metadata['reason'])) {
                        $publication->moderation_reason = $hideAction->metadata['reason'];
                        $publication->moderation_date = $hideAction->created_at;
                    }
                }
                return $publication;
            });
            
            $categories = Category::select('id', 'name')->get();

            return Inertia::render('publications/my-publications', [
                'publications' => $publications,
                'categories' => $categories,
                'selectedStatus' => $request->status,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in myPublications: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al cargar las publicaciones']);
        }
    }

    public function create()
    {
        $categories = Category::select('id', 'name')->get();
        
        return Inertia::render('publications/create-publication', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        try {
            // Validación actualizada - lat y lng son obligatorios
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'price' => 'required|numeric|min:0',
                'category_id' => 'required|exists:categories,id',
                'type' => 'required|in:producto,servicio',
                'lat' => 'required|numeric|between:-90,90',
                'lng' => 'required|numeric|between:-180,180',
                'horario' => 'nullable|string|max:255',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->horario)) {
                return redirect()->back()->withErrors(['horario' => 'El horario es obligatorio para servicios.']);
            }

            // Validar contenido inapropiado (versión optimizada)
            try {
                $profanityService = new ProfanityService();
                
                // Log para debugging
                Log::info('Profanity validation started', [
                    'enabled' => config('profanity.enabled', true),
                    'user_id' => Auth::id(),
                ]);
                
                // Validar solo campos no vacíos para optimizar
                $fieldsToValidate = [];
                if (!empty($request->title)) {
                    $fieldsToValidate['title'] = $request->title;
                }
                if (!empty($request->description)) {
                    $fieldsToValidate['description'] = $request->description;
                }
                if (!empty($request->horario)) {
                    $fieldsToValidate['horario'] = $request->horario;
                }
                
                Log::info('Fields to validate', [
                    'fields' => $fieldsToValidate,
                    'user_id' => Auth::id(),
                ]);
                
                if (!empty($fieldsToValidate)) {
                    $profanityService->validateFields($fieldsToValidate);
                }
                
                Log::info('Profanity validation passed', [
                    'user_id' => Auth::id(),
                ]);
                
            } catch (ProfanityDetectedException $e) {
                Log::warning('Profanity detected', [
                    'message' => $e->getMessage(),
                    'detected_words' => $e->getDetectedWords(),
                    'user_id' => Auth::id(),
                ]);
                
                return redirect()->back()->withErrors([
                    'content' => $e->getMessage()
                ])->withInput();
            } catch (\Exception $e) {
                // Si hay error en la validación, continuar sin validar
                Log::warning('Profanity validation failed', [
                    'error' => $e->getMessage(),
                    'user_id' => Auth::id(),
                ]);
            }

            $userId = Auth::id();
            
            // Obtener ubicación legible usando reverse geocoding
            $location = GeocodingService::reverseGeocode($request->lat, $request->lng);
            
            $publicationData = [
                'code' => Str::uuid(),
                'title' => $request->title,
                'description' => $request->description,
                'price' => $request->price,
                'location' => $location, // Ubicación obtenida por reverse geocoding
                'disponibility' => true,
                'category_id' => $request->category_id,
                'created_by' => $userId,
                'status' => StatusType::HABILITADO, // Siempre crear como HABILITADO
                'type' => $request->type,
                'published_at' => now(),
                'horario' => $request->horario,
            ];

            // Agregar coordenadas geográficas
            try {
                // Crear Point sin dimensión Z (lng, lat) - PostGIS usa longitud primero
                $publicationData['location_point'] = Point::make($request->lng, $request->lat);
            } catch (\Exception $e) {
                // Error creating Point - continue without location
                Log::error('Error creating Point for publication', [
                    'lat' => $request->lat,
                    'lng' => $request->lng,
                    'error' => $e->getMessage()
                ]);
            }

            $publication = Publication::create($publicationData);

            // Guardar imágenes si las hay
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('publications', 'public');
                    PublicationImage::create([
                        'publication_id' => $publication->id,
                        'image_url' => $path,
                    ]);
                }
            }

            return redirect()->route('my-publications')->with('success', 'Publicación creada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al crear la publicación: ' . $e->getMessage()]);
        }
    }

    public function edit($id)
    {
        $publication = Publication::with(['category', 'images'])
            ->where('created_by', Auth::id())
            ->findOrFail($id);
        
        // Extraer coordenadas del campo location_point si existe
        $coords = DB::selectOne("SELECT ST_X(location_point::geometry) as lng, ST_Y(location_point::geometry) as lat FROM publications WHERE id = ?", [$id]);
        
        if ($coords) {
            $publication->location_point = [
                'lat' => (float) $coords->lat,
                'lng' => (float) $coords->lng
            ];
        } else {
            $publication->location_point = null;
        }
        
        $categories = Category::select('id', 'name')->get();

        return Inertia::render('publications/edit-publication', [
            'publication' => $publication,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return redirect()->route('login');
            }
            
            $publication = Publication::where('created_by', $userId)->findOrFail($id);


            // Validación actualizada - lat y lng son obligatorios
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'price' => 'required|numeric|min:0',
                'category_id' => 'required|exists:categories,id',
                'type' => 'required|in:producto,servicio',
                'lat' => 'required|numeric|between:-90,90',
                'lng' => 'required|numeric|between:-180,180',
                'horario' => 'nullable|string|max:255',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->horario)) {
                return redirect()->back()->withErrors(['horario' => 'El horario es obligatorio para servicios.']);
            }

            // Obtener ubicación legible usando reverse geocoding
            $location = GeocodingService::reverseGeocode($request->lat, $request->lng);
            
            // Actualizar solo los campos que se envían y no están vacíos
            $updateData = [];
            
            if ($request->filled('title')) {
                $updateData['title'] = $request->title;
            }
            if ($request->filled('description')) {
                $updateData['description'] = $request->description;
            }
            if ($request->filled('price')) {
                $updateData['price'] = $request->price;
            }
            if ($request->filled('category_id')) {
                $updateData['category_id'] = $request->category_id;
            }
            if ($request->filled('type')) {
                $updateData['type'] = $request->type;
            }
            // Actualizar ubicación con reverse geocoding
            $updateData['location'] = $location;
            if ($request->filled('horario')) {
                $updateData['horario'] = $request->horario;
            }

            // Actualizar coordenadas geográficas
            try {
                // Crear Point sin dimensión Z (lng, lat) - PostGIS usa longitud primero
                $updateData['location_point'] = Point::make($request->lng, $request->lat);
            } catch (\Exception $e) {
                // Error creating Point - continue without location
                Log::error('Error creating Point for publication update', [
                    'lat' => $request->lat,
                    'lng' => $request->lng,
                    'error' => $e->getMessage()
                ]);
            }

            if (!empty($updateData)) {
                $publication->update($updateData);
            }

            // Manejar imágenes existentes
            if ($request->has('existing_images')) {
                // Obtener IDs de imágenes que se mantienen
                $keepImageIds = $request->input('existing_images', []);
                
                // Eliminar imágenes que no están en la lista de mantener
                $imagesToDelete = $publication->images()->whereNotIn('id', $keepImageIds)->get();
                foreach ($imagesToDelete as $image) {
                    // Eliminar del storage
                    Storage::disk('public')->delete($image->image_url);
                    // Eliminar de la base de datos
                    $image->delete();
                }
            } else {
                // Si no se envían existing_images, eliminar todas las imágenes existentes
                foreach ($publication->images as $image) {
                    Storage::disk('public')->delete($image->image_url);
                    $image->delete();
                }
            }

            // Guardar nuevas imágenes si las hay
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('publications', 'public');
                    PublicationImage::create([
                        'publication_id' => $publication->id,
                        'image_url' => $path,
                    ]);
                }
            }

            return redirect()->route('my-publication-view', $publication->id)->with('success', 'Publicación actualizada exitosamente.');
            
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al actualizar la publicación: ' . $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        $publication = Publication::where('created_by', Auth::id())->findOrFail($id);
        
        // Eliminar imágenes del storage
        foreach ($publication->images as $image) {
            Storage::disk('public')->delete($image->image_url);
        }
        
        $publication->delete();

        return redirect()->route('my-publications')->with('success', 'Publicación eliminada exitosamente.');
    }

    public function toggleStatus($id)
    {
        $publication = Publication::where('created_by', Auth::id())->findOrFail($id);
        
        $newStatus = $publication->status === StatusType::HABILITADO 
            ? StatusType::INHABILITADO 
            : StatusType::HABILITADO;
        
        $publication->update(['status' => $newStatus]);

        return redirect()->route('my-publications')->with('success', 
            $newStatus === StatusType::HABILITADO 
                ? 'Publicación habilitada exitosamente.' 
                : 'Publicación inhabilitada exitosamente.'
        );
    }

    public function view($id)
    {
        $publication = Publication::with(['user', 'category', 'images'])->findOrFail($id);
        return Inertia::render('publications/publication-view', [
            'publication' => $publication
        ]);
    }

    public function myView($id)
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return redirect()->route('login');
            }
            
            $publication = Publication::with(['category', 'images'])
                ->where('created_by', $userId)
                ->findOrFail($id);
                
                
            return Inertia::render('publications/my-publication-view', [
                'publication' => $publication
            ]);
        } catch (\Exception $e) {
            Log::error('Error in myView: ' . $e->getMessage());
            return redirect()->route('my-publications')->withErrors(['error' => 'Error al cargar la publicación']);
        }
    }

    /**
     * Reportar una publicación
     */
    public function report(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        try {
            $publication = Publication::findOrFail($id);
            $reporterId = Auth::id();

            // Rate limiting: verificar si el usuario ya reportó esta publicación en los últimos 60 minutos
            $recentReport = ModerationReport::where('reporter_id', $reporterId)
                ->whereHas('moderationCase', function($query) use ($id) {
                    $query->where('publication_id', $id);
                })
                ->where('created_at', '>=', now()->subMinutes(60))
                ->first();

            if ($recentReport) {
                return back()->withErrors(['error' => 'Ya has reportado esta publicación recientemente. Espera 60 minutos antes de reportar nuevamente.']);
            }

            DB::beginTransaction();

            // Buscar si ya existe un caso abierto para esta publicación
            $existingCase = ModerationCase::where('publication_id', $id)
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->first();

            if ($existingCase) {
                // Agregar reporte al caso existente
                $existingCase->increment('report_count');
                
                ModerationReport::create([
                    'moderation_case_id' => $existingCase->id,
                    'reporter_id' => $reporterId,
                    'reason' => $request->reason,
                    'description' => $request->description,
                    'metadata' => [
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                    ]
                ]);
            } else {
                // Crear nuevo caso de moderación
                $moderationCase = ModerationCase::create([
                    'publication_id' => $id,
                    'status' => 'pending',
                    'source' => 'user',
                    'report_count' => 1,
                ]);

                // Asignación automática al moderador con menor carga
                $this->assignToModerator($moderationCase);

                ModerationReport::create([
                    'moderation_case_id' => $moderationCase->id,
                    'reporter_id' => $reporterId,
                    'reason' => $request->reason,
                    'description' => $request->description,
                    'metadata' => [
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                    ]
                ]);
            }

            DB::commit();

            return back()->with('success', 'Reporte enviado correctamente. Nuestro equipo de moderación revisará el contenido.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al reportar publicación: ' . $e->getMessage());
            
            return back()->withErrors(['error' => 'Error al procesar el reporte. Inténtalo nuevamente.']);
        }
    }

    /**
     * Asignar caso a moderador con menor carga
     */
    private function assignToModerator(ModerationCase $case)
    {
        // Buscar moderadores activos disponibles (SOLO moderadores)
        $moderator = User::where('role', 'moderador') // Solo moderadores, no admins
            ->where('status', StatusType::HABILITADO->value) // Solo activos
            ->where('is_active', true) // Solo activos
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->first();

        if ($moderator) {
            $case->update([
                'assigned_moderator_id' => $moderator->id,
                'assigned_at' => now(),
            ]);
        }
    }

    /**
     * Apelar una moderación
     */
    public function appeal(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        try {
            $publication = Publication::findOrFail($id);
            
            // Verificar que el usuario sea el propietario de la publicación
            if ($publication->created_by !== Auth::id()) {
                return redirect()->back()->withErrors(['error' => 'No tienes permisos para apelar esta publicación']);
            }

            // Verificar que la publicación esté oculta
            if (!$publication->is_hidden) {
                return redirect()->back()->withErrors(['error' => 'Solo puedes apelar publicaciones que han sido ocultadas por moderación']);
            }

            // Buscar el caso de moderación (cualquier status)
            $moderationCase = ModerationCase::where('publication_id', $id)->first();

            if (!$moderationCase) {
                return redirect()->back()->withErrors(['error' => 'No se encontró un caso de moderación para esta publicación']);
            }

            // NUEVA VALIDACIÓN: Verificar que no exista una apelación pendiente
            $existingAppeal = ModerationAppeal::where('moderation_case_id', $moderationCase->id)
                ->whereNull('reviewed_at') // Apelación no revisada
                ->first();

            if ($existingAppeal) {
                return redirect()->back()->withErrors(['error' => 'Ya existe una apelación pendiente para este caso. Debes esperar a que sea revisada.']);
            }

            DB::beginTransaction();

            // Guardar el ID del moderador original para asignar a uno diferente
            $originalModeratorId = $moderationCase->assigned_moderator_id;

            // Crear la apelación
            $appeal = ModerationAppeal::create([
                'moderation_case_id' => $moderationCase->id,
                'appealer_id' => Auth::id(),
                'appeal_reason' => $request->reason,
            ]);

            // Actualizar el caso a estado "appealed" y desasignar al moderador anterior
            $moderationCase->update([
                'status' => 'appealed',
                'assigned_moderator_id' => null,
                'assigned_at' => null,
            ]);

            // Asignar a un moderador diferente
            $this->assignAppealToDifferentModerator($moderationCase, $originalModeratorId);

            DB::commit();

            return redirect()->back()->with('success', 'Apelación enviada correctamente. Un moderador diferente revisará tu caso.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al enviar apelación: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al enviar la apelación: ' . $e->getMessage()]);
        }
    }

    /**
     * Asignar apelación a un moderador diferente al original
     */
    private function assignAppealToDifferentModerator(ModerationCase $case, $originalModeratorId)
    {
        // Si no hay moderador original, usar asignación normal
        if (!$originalModeratorId) {
            $this->assignToModerator($case);
            return;
        }

        // Buscar moderadores diferentes al original (SOLO moderadores)
        $moderator = User::where('role', 'moderador') // Solo moderadores, no admins
            ->where('id', '!=', $originalModeratorId) // Excluir al moderador original
            ->where('status', StatusType::HABILITADO->value) // Solo activos
            ->where('is_active', true) // Solo activos
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->first();

        if ($moderator) {
            $case->update([
                'assigned_moderator_id' => $moderator->id,
                'assigned_at' => now(),
            ]);
        } else {
            // No hay moderadores disponibles - dejar sin asignar hasta que se cree uno
            $this->handleNoModeratorsAvailable($case, $originalModeratorId);
        }
    }

    /**
     * Manejar caso cuando no hay moderadores disponibles para la apelación
     */
    private function handleNoModeratorsAvailable(ModerationCase $case, $originalModeratorId)
    {
        // Dejar el caso sin asignar - esperará hasta que se cree un nuevo moderador
        $case->update([
            'assigned_moderator_id' => null,
            'assigned_at' => null,
        ]);

        // Registrar que está esperando moderador
        ModerationAction::create([
            'moderation_case_id' => $case->id,
            'moderator_id' => $originalModeratorId,
            'action_type' => 'waiting_for_moderator',
            'action_description' => 'Apelación en espera - No hay moderadores disponibles para revisar',
            'metadata' => [
                'original_moderator_id' => $originalModeratorId,
                'waiting_reason' => 'no_moderators_available',
                'status' => 'pending_moderator_assignment',
            ]
        ]);
    }
}
