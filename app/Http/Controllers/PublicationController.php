<?php

namespace App\Http\Controllers;

use App\Enums\StatusType;
use App\Enums\PublicationType;
use App\Models\Category;
use App\Models\Favorite;
use App\Models\Publication;
use App\Models\PublicationImage;
use App\Models\ModerationCase;
use App\Models\ModerationReport;
use App\Models\ModerationAppeal;
use App\Models\ModerationAction;
use App\Models\User;
use App\Models\PublicationServiceHour;
use App\Services\GeocodingService;
use App\Services\SimpleProfanityService;
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
        // Validar precios
        if ($request->filled('min_price') && $request->filled('max_price')) {
            $minPrice = (float) $request->min_price;
            $maxPrice = (float) $request->max_price;
            
            if ($minPrice > $maxPrice) {
                return redirect()->back()->with('error', 'El precio mínimo no puede ser mayor que el precio máximo.');
            }
        }
        
        // Mostrar mensaje informativo cuando solo se selecciona precio mínimo
        if ($request->filled('min_price') && !$request->filled('max_price')) {
            return redirect()->back()->with('info', 'Para filtrar por precio, selecciona también el precio máximo.');
        }
        
        // Mostrar mensaje informativo cuando solo se selecciona precio máximo
        if (!$request->filled('min_price') && $request->filled('max_price')) {
            return redirect()->back()->with('info', 'Para filtrar por precio, selecciona también el precio mínimo.');
        }
        
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
                [$lng, $lat, $radiusKm * 1000] // ST_MakePoint usa (longitud, latitud) - convertir km a metros
            );
        }

        $query->where('status', StatusType::HABILITADO)
            ->where('is_hidden', false);

        $publications = $query->paginate(6)->withQueryString();

        // Extraer coordenadas para cada publicación
        foreach ($publications as $publication) {
            $coords = DB::selectOne("SELECT ST_X(location_point::geometry) as lng, ST_Y(location_point::geometry) as lat FROM publications WHERE id = ?", [$publication->id]);

            if ($coords) {
                $publication->location_point = [
                    'lat' => (float) $coords->lat,
                    'lng' => (float) $coords->lng
                ];
            } else {
                $publication->location_point = null;
            }
        }

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
                ->with(['category', 'images', 'moderationCases' => function ($query) {
                    $query->with(['actions' => function ($actionQuery) {
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
                $coords = DB::selectOne("SELECT ST_X(location_point::geometry) as lng, ST_Y(location_point::geometry) as lat FROM publications WHERE id = ?", [$publication->id]);

                if ($coords) {
                    $publication->location_point = [
                        'lat' => (float) $coords->lat,
                        'lng' => (float) $coords->lng
                    ];
                } else {
                    $publication->location_point = null;
                }
                Log::info('Procesando publicación', [
                    'publication_id' => $publication->id,
                    'is_hidden' => $publication->is_hidden,
                    'cases_count' => $publication->moderationCases->count()
                ]);

                if ($publication->is_hidden && $publication->moderationCases->isNotEmpty()) {
                    $latestCase = $publication->moderationCases->first();
                    $hideAction = $latestCase->actions()
                        ->where('action_type', 'hide_publication')
                        ->first();
                    
                    // Si no hay acción de ocultación, buscar cualquier acción
                    if (!$hideAction) {
                        $hideAction = $latestCase->actions->first();
                    }                    
                    Log::info('Caso encontrado', [
                        'publication_id' => $publication->id,
                        'case_id' => $latestCase->id,
                        'case_status' => $latestCase->status,
                        'case_source' => $latestCase->source,
                        'has_action' => $hideAction ? true : false
                    ]);
                    
                    // Verificar si es un caso de auto-moderación
                    $isAutoModeration = $latestCase->source === 'system';
                    
                    if ($latestCase->status === 'closed') {
                        // Buscar la decisión final del moderador
                        $finalDecision = $latestCase->actions()
                            ->where('action_type', 'close_case')
                            ->whereJsonContains('metadata->action_subtype', 'confirm_hide_decision')
                            ->first();
                        
                        if ($finalDecision && isset($finalDecision->metadata['notes'])) {
                            // Mostrar el comentario de la decisión final
                            $publication->moderation_reason = $finalDecision->metadata['notes'];
                            $publication->moderation_date = $finalDecision->created_at;
                            $publication->is_final_decision = true;
                        } else if ($hideAction && isset($hideAction->metadata['reason'])) {
                            // Fallback al motivo inicial
                            $publication->moderation_reason = $hideAction->metadata['reason'];
                            $publication->moderation_date = $hideAction->created_at;
                            $publication->is_final_decision = false;
                        }
                    } else if ($hideAction && isset($hideAction->metadata['reason'])) {
                        // Para casos no cerrados, mostrar el motivo inicial
                        $publication->moderation_reason = $hideAction->metadata['reason'];
                        $publication->moderation_date = $hideAction->created_at;
                        $publication->is_final_decision = false;
                    }

                    // Agregar estado del caso para validación en frontend
                    $publication->moderation_case_status = $latestCase->status;

                    // Para casos de auto-moderación, siempre permitir apelaciones
                    // Identificar auto-moderación por metadata de la acción
                    $isAutoModeration = false;
                    if ($hideAction && isset($hideAction->metadata['auto_moderation']) && $hideAction->metadata['auto_moderation']) {
                        $isAutoModeration = true;
                    }

                    if ($isAutoModeration) {
                        $publication->can_appeal = true;
                        Log::info('Auto-moderación detectada - permitiendo apelación', [
                            'publication_id' => $publication->id,
                            'case_id' => $latestCase->id
                        ]);
                    } else {
                        // Para casos normales, usar la lógica estándar
                        
                        $publication->can_appeal = !in_array($latestCase->status, ['closed', 'dismissed']);
                        Log::info('Caso normal - aplicando lógica estándar', [
                            'publication_id' => $publication->id,
                            'case_status' => $latestCase->status,
                            'can_appeal' => $publication->can_appeal
                        ]);
                    }
                } else {
                    $publication->can_appeal = false;
                    $publication->moderation_case_status = null;
                    Log::info('Publicación sin casos de moderación', [
                        'publication_id' => $publication->id,
                        'is_hidden' => $publication->is_hidden
                    ]);
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
                'schedule' => 'nullable|string|max:2000',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);
            Log::info('DATOS DESDE EL FRONT', [
                'title' => $request->title,
                'horario' => $request->horario,
                'schedule' => $request->schedule
            ]);

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->schedule)) {
                return redirect()->back()->withErrors(['schedule' => 'El horario es obligatorio para servicios.']);
            }
            // Verificar contenido inapropiado para auto-moderación
            $profanityService = new SimpleProfanityService();
            $autoModerationInfo = [
                'has_profanity' => false,
                'reason' => null,
                'detected_words' => []
            ];

            Log::info('Iniciando verificación de contenido inadecuado', [
                'title' => $request->title,
                'description' => $request->description,
                'horario' => $request->horario
            ]);

            // Verificar título
            if (!empty($request->title)) {
                Log::info('Verificando título', ['title' => $request->title]);
                $titleCheck = $profanityService->checkForAutoModeration($request->title);
                Log::info('Resultado verificación título', [
                    'has_profanity' => $titleCheck['has_profanity'],
                    'detected_words' => $titleCheck['detected_words']
                ]);
                if ($titleCheck['has_profanity']) {
                    $autoModerationInfo = $titleCheck;
                }
            }
            // Verificar descripción
            if (!$autoModerationInfo['has_profanity'] && !empty($request->description)) {
                Log::info('Verificando descripción', ['description' => $request->description]);
                $descriptionCheck = $profanityService->checkForAutoModeration($request->description);
                Log::info('Resultado verificación descripción', [
                    'has_profanity' => $descriptionCheck['has_profanity'],
                    'detected_words' => $descriptionCheck['detected_words']
                ]);
                if ($descriptionCheck['has_profanity']) {
                    $autoModerationInfo = $descriptionCheck;
                }
            }

            // Verificar horario
            if (!$autoModerationInfo['has_profanity'] && !empty($request->horario)) {
                Log::info('Verificando horario', ['horario' => $request->horario]);
                $horarioCheck = $profanityService->checkForAutoModeration($request->horario);
                Log::info('Resultado verificación horario', [
                    'has_profanity' => $horarioCheck['has_profanity'],
                    'detected_words' => $horarioCheck['detected_words']
                ]);
                if ($horarioCheck['has_profanity']) {
                    $autoModerationInfo = $horarioCheck;
                }
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
                'schedule' => $request->schedule,
                'is_hidden' => $autoModerationInfo['has_profanity'], // Ocultar si tiene contenido inadecuado
            ];

            // Agregar coordenadas geográficas
            try {
                // Validar coordenadas
                $lat = floatval($request->lat);
                $lng = floatval($request->lng);

                // Verificar que las coordenadas estén en rangos válidos
                if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
                    throw new \InvalidArgumentException('Coordenadas fuera de rango válido');
                }

                // Redondear coordenadas para mayor precisión
                $roundedLat = round($lat, 6);
                $roundedLng = round($lng, 6);

                Log::info('Creating Point for publication', [
                    'original' => ['lat' => $lat, 'lng' => $lng],
                    'rounded' => ['lat' => $roundedLat, 'lng' => $roundedLng]
                ]);

                // Crear Point sin dimensión Z (lng, lat) - PostGIS usa longitud primero
                $publicationData['location_point'] = Point::make($roundedLng, $roundedLat);
            } catch (\Exception $e) {
                // Error creating Point - continue without location
                Log::error('Error creating Point for publication', [
                    'lat' => $request->lat,
                    'lng' => $request->lng,
                    'error' => $e->getMessage()
                ]);
            }

            $publication = Publication::create($publicationData);
            Log::info('Verificando auto-moderación', [
                'publication_id' => $publication->id,
                'has_profanity' => $autoModerationInfo['has_profanity'],
                'detected_words' => $autoModerationInfo['detected_words'] ?? [],
                'reason' => $autoModerationInfo['reason'] ?? null
            ]);

            // Si tiene contenido inadecuado, crear caso de moderación automático
            if ($autoModerationInfo['has_profanity']) {
                Log::info('Creando caso de auto-moderación', [
                    'publication_id' => $publication->id
                ]);
                $this->createAutoModerationCase($publication, $autoModerationInfo);
            } else {
                Log::info('No se detectó contenido inadecuado', [
                    'publication_id' => $publication->id
                ]);
            }
            if ($request->type === 'servicio' && $request->schedule) {
                $schedule = json_decode($request->schedule, true);
                if (is_array($schedule)) {
                    foreach ($schedule as $timeSlot) {
                        PublicationServiceHour::create([
                            'publication_id' => $publication->id,
                            'day_of_week' => $timeSlot['day'],
                            'open_time' => $timeSlot['open'],
                            'close_time' => $timeSlot['close'],
                        ]);
                    }
                }
            }

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

            // Mensaje diferente si fue ocultada por contenido inadecuado
            $successMessage = $autoModerationInfo['has_profanity']
                ? 'Publicación creada pero oculta por contenido inadecuado. Puedes apelar esta decisión.'
                : 'Publicación creada exitosamente.';

            return redirect()->route('my-publications')->with('success', $successMessage);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al crear la publicación: ' . $e->getMessage()]);
        }
    }

    /**
     * Crear caso de moderación automático para publicaciones con contenido inadecuado
     */
    private function createAutoModerationCase(Publication $publication, array $autoModerationInfo)
    {
        try {
            // Crear el caso de moderación
            $moderationCase = ModerationCase::create([
                'publication_id' => $publication->id,
                'status' => 'appealed', // Caso en estado appealed para permitir apelaciones
                'source' => 'system', // Usar 'system' en lugar de 'auto_moderation'
                'assigned_moderator_id' => null, // No asignado a moderador
                'assigned_at' => null,
            ]);

            Log::info('Caso de auto-moderación creado', [
                'case_id' => $moderationCase->id,
                'publication_id' => $publication->id,
                'status' => $moderationCase->status,
                'source' => $moderationCase->source,
                'assigned_moderator_id' => $moderationCase->assigned_moderator_id
            ]);

            // Crear la acción de moderación
            ModerationAction::create([
                'moderation_case_id' => $moderationCase->id,
                'moderator_id' => null, // Sistema automático
                'action_type' => 'hide_publication',
                'action_description' => 'Publicación ocultada automáticamente por contenido inadecuado',
                'metadata' => [
                    'reason' => $autoModerationInfo['reason'],
                    'detected_words' => $autoModerationInfo['detected_words'],
                    'auto_moderation' => true,
                    'system_action' => true,
                    'moderated_by' => 'system_automation',
                ]
            ]);

            Log::info('Caso de moderación automático creado', [
                'case_id' => $moderationCase->id,
                'publication_id' => $publication->id,
                'status' => $moderationCase->status,
                'source' => $moderationCase->source,
                'reason' => $autoModerationInfo['reason'],
                'detected_words' => $autoModerationInfo['detected_words']
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear caso de moderación automático', [
                'publication_id' => $publication->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function edit($id)
    {
        $publication = Publication::with(['category', 'images', 'serviceHours'])
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

        // Forzar serialización correcta
        $publicationData = $publication->toArray();
        $publicationData['serviceHours'] = $publication->serviceHours->toArray();

        return Inertia::render('publications/edit-publication', [
            'publication' => $publicationData,
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
                'schedule' => 'nullable|string|max:2000',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->schedule)) {
                return redirect()->back()->withErrors(['schedule' => 'El horario es obligatorio para servicios.']);
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
            // El horario se manejará por separado con serviceHours

            // Actualizar coordenadas geográficas
            try {
                // Validar coordenadas
                $lat = floatval($request->lat);
                $lng = floatval($request->lng);

                // Verificar que las coordenadas estén en rangos válidos
                if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
                    throw new \InvalidArgumentException('Coordenadas fuera de rango válido');
                }

                // Redondear coordenadas para mayor precisión
                $roundedLat = round($lat, 6);
                $roundedLng = round($lng, 6);

                Log::info('Updating Point for publication', [
                    'original' => ['lat' => $lat, 'lng' => $lng],
                    'rounded' => ['lat' => $roundedLat, 'lng' => $roundedLng]
                ]);

                // Crear Point sin dimensión Z (lng, lat) - PostGIS usa longitud primero
                $updateData['location_point'] = Point::make($roundedLng, $roundedLat);
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

            // Actualizar horarios de servicio si es tipo servicio
            if ($request->type === 'servicio' && $request->schedule) {
                // Eliminar horarios existentes
                $publication->serviceHours()->delete();

                // Crear nuevos horarios
                $schedule = json_decode($request->schedule, true);
                if (is_array($schedule)) {
                    foreach ($schedule as $timeSlot) {
                        PublicationServiceHour::create([
                            'publication_id' => $publication->id,
                            'day_of_week' => $timeSlot['day'],
                            'open_time' => $timeSlot['open'],
                            'close_time' => $timeSlot['close'],
                        ]);
                    }
                }
            } elseif ($request->type === 'producto') {
                // Si cambió a producto, eliminar horarios de servicio
                $publication->serviceHours()->delete();
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

        return redirect()->route('my-publications')->with(
            'success',
            $newStatus === StatusType::HABILITADO
                ? 'Publicación habilitada exitosamente.'
                : 'Publicación inhabilitada exitosamente.'
        );
    }

    public function view($id)
    {
        $publication = Publication::with(['user', 'category', 'images', 'serviceHours'])->findOrFail($id);

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

        // Forzar serialización correcta
        $publicationData = $publication->toArray();
        $publicationData['serviceHours'] = $publication->serviceHours->toArray();

        return Inertia::render('publications/publication-view', [
            'publication' => $publicationData
        ]);
    }

    public function myView($id)
    {
        try {
            $userId = Auth::id();

            if (!$userId) {
                return redirect()->route('login');
            }

            $publication = Publication::with(['category', 'images', 'serviceHours'])
                ->where('created_by', $userId)
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

            // Verificar estado de moderación
            $moderationCase = ModerationCase::where('publication_id', $id)->first();
            $hasFinalDecision = false;
            
            if ($moderationCase && $moderationCase->status === 'closed' && $publication->is_hidden) {
                // Si el caso está cerrado y la publicación está oculta, es una decisión final
                $hasFinalDecision = true;
            }

            // Forzar serialización correcta
            $publicationData = $publication->toArray();
            $publicationData['serviceHours'] = $publication->serviceHours->toArray();
            $publicationData['has_final_moderation_decision'] = $hasFinalDecision;

            return Inertia::render('publications/my-publication-view', [
                'publication' => $publicationData
            ]);
        } catch (\Exception $e) {
            Log::error('Error in myView: ' . $e->getMessage());
            return redirect()->route('my-publications')->withErrors(['error' => 'Error al cargar la publicación']);
        }
    }

    public function favorites()
    {
        try {
            /** @var \App\Models\User|null $user */
            $user = Auth::user();
            
            if (!$user) {
                return redirect()->route('login');
            }
            
            $favorites = $user->favorites()
                ->with(['publication.category', 'publication.images', 'publication.serviceHours'])
                ->paginate(12);

            // Transformar los datos para que sean compatibles con el frontend
            $favoritesData = $favorites->through(function ($favorite) {
                $publication = $favorite->publication;
                $publicationData = $publication->toArray();
                $publicationData['serviceHours'] = $publication->serviceHours->toArray();
                return $publicationData;
            });

            return Inertia::render('publications/favorites', [
                'favorites' => $favoritesData,
                'categories' => Category::all()
            ]);
        } catch (\Exception $e) {
            Log::error('Error in favorites: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al cargar los favoritos']);
        }
    }

    public function addToFavorites($id)
    {
        try {
            $publication = Publication::findOrFail($id);
            
            // Verificar si ya está en favoritos
            $existingFavorite = Favorite::where('user_id', Auth::id())
                ->where('publication_id', $id)
                ->first();

            if ($existingFavorite) {
                return back()->with('error', 'Ya está en favoritos');
            }

            Favorite::create([
                'user_id' => Auth::id(),
                'publication_id' => $id
            ]);

            return back()->with('success', 'Agregado a favoritos');
        } catch (\Exception $e) {
            Log::error('Error adding to favorites: ' . $e->getMessage());
            return back()->with('error', 'Error al agregar a favoritos');
        }
    }

    public function removeFromFavorites($id)
    {
        try {
            $favorite = Favorite::where('user_id', Auth::id())
                ->where('publication_id', $id)
                ->first();

            if (!$favorite) {
                return back()->with('error', 'No está en favoritos');
            }

            $favorite->delete();

            return back()->with('success', 'Eliminado de favoritos');
        } catch (\Exception $e) {
            Log::error('Error removing from favorites: ' . $e->getMessage());
            return back()->with('error', 'Error al eliminar de favoritos');
        }
    }

    public function checkFavorite($id)
    {
        try {
            $isFavorite = Favorite::where('user_id', Auth::id())
                ->where('publication_id', $id)
                ->exists();

            return response()->json(['isFavorite' => $isFavorite]);
        } catch (\Exception $e) {
            Log::error('Error checking favorite: ' . $e->getMessage());
            return response()->json(['isFavorite' => false]);
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
                ->whereHas('moderationCase', function ($query) use ($id) {
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
        // Buscar moderadores y admins activos disponibles (NO super_admin)
        $moderator = User::whereIn('role', ['moderador', 'admin']) // Solo moderadores y admins
            ->where('status', StatusType::HABILITADO->value) // Solo activos
            ->where('is_active', true) // Solo activos
            ->withCount(['moderationCases' => function ($query) {
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
        Log::info('Iniciando proceso de apelación', [
            'publication_id' => $id,
            'user_id' => Auth::id(),
            'reason' => $request->reason
        ]);

        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        try {
            $publication = Publication::findOrFail($id);

            // Verificar que el usuario sea el propietario de la publicación
            if ($publication->created_by !== Auth::id()) {
                Log::warning('Usuario no es propietario de la publicación', [
                    'publication_owner' => $publication->created_by,
                    'current_user' => Auth::id()
                ]);
                return redirect()->back()->withErrors(['error' => 'No tienes permisos para apelar esta publicación']);
            }


            // Buscar el caso de moderación (cualquier status)
            $moderationCase = ModerationCase::where('publication_id', $id)->first();

            Log::info('Caso de moderación encontrado', [
                'case_id' => $moderationCase ? $moderationCase->id : null,
                'case_status' => $moderationCase ? $moderationCase->status : null,
                'assigned_moderator' => $moderationCase ? $moderationCase->assigned_moderator_id : null
            ]);

            if (!$moderationCase) {
                Log::warning('No se encontró caso de moderación', ['publication_id' => $id]);
                return redirect()->back()->withErrors(['error' => 'No se encontró un caso de moderación para esta publicación']);
            }

            // Verificar que el caso no haya llegado a una decisión final IRREVERSIBLE
            // NOTA: 'action_taken' permite apelaciones, solo 'closed' es irreversible

            // Verificar que el caso no esté cerrado (solo permitir si está activo o appealed)
            if ($moderationCase->status === 'closed') {
                Log::warning('Caso cerrado - No se pueden enviar más apelaciones', [
                    'case_status' => $moderationCase->status
                ]);
                return redirect()->back()->withErrors(['error' => 'Este caso ya está cerrado. No se pueden enviar más apelaciones.']);
            }

            // Si el caso está en 'appealed', permitir múltiples apelaciones
            if ($moderationCase->status === 'appealed') {
                Log::info('Caso en estado appealed - Se permiten múltiples apelaciones', [
                    'case_status' => $moderationCase->status
                ]);
            }

            // Verificar que la publicación esté oculta (solo se puede apelar publicaciones ocultas)
            if (!$publication->is_hidden) {
                Log::warning('Publicación no está oculta', [
                    'is_hidden' => $publication->is_hidden
                ]);
                return redirect()->back()->withErrors(['error' => 'Solo puedes apelar publicaciones que han sido ocultadas por moderación.']);
            }

            Log::info('Iniciando transacción de apelación');
            DB::beginTransaction();

            // Guardar el ID del moderador original para asignar a uno diferente
            $originalModeratorId = $moderationCase->assigned_moderator_id;

            Log::info('Creando apelación', [
                'moderation_case_id' => $moderationCase->id,
                'appealer_id' => Auth::id(),
                'original_moderator_id' => $originalModeratorId
            ]);

            // Crear la apelación
            $appeal = ModerationAppeal::create([
                'moderation_case_id' => $moderationCase->id,
                'appealer_id' => Auth::id(),
                'appeal_reason' => $request->reason,
            ]);

            Log::info('Apelación creada exitosamente', ['appeal_id' => $appeal->id]);

            // Actualizar el caso a estado "appealed" y desasignar al moderador anterior
            // Si el caso estaba 'closed', reabrirlo con la apelación
            if ($moderationCase->status === 'closed') {
                Log::info('Reabriendo caso cerrado con apelación', [
                    'case_id' => $moderationCase->id,
                    'previous_status' => $moderationCase->status
                ]);

                $moderationCase->update([
                    'status' => 'appealed',
                    'assigned_moderator_id' => null,
                    'assigned_at' => null,
                ]);
            } elseif ($moderationCase->status !== 'appealed') {
                // Si no está en 'appealed', cambiar el estado
                $moderationCase->update([
                    'status' => 'appealed',
                    'assigned_moderator_id' => null,
                    'assigned_at' => null,
                ]);
                
                // Asignar a un moderador diferente para revisar la apelación
                Log::info('Asignando apelación a moderador diferente');
                $this->assignAppealToDifferentModerator($moderationCase, $originalModeratorId);
                
                DB::commit();
                Log::info('Apelación procesada exitosamente');
                
                return redirect()->back()->with('success', 'Apelación enviada correctamente. Un moderador diferente revisará tu caso.');
            } else {
                // Si ya está en "appealed", verificar si ya tiene un moderador asignado
                if ($moderationCase->assigned_moderator_id) {
                    // Ya hay un moderador asignado para revisar apelaciones
                    // Las apelaciones adicionales siguen siendo del mismo moderador
                    Log::info('Caso ya tiene moderador asignado para apelaciones', [
                        'assigned_moderator_id' => $moderationCase->assigned_moderator_id,
                        'case_id' => $moderationCase->id
                    ]);
                    
                    DB::commit();
                    Log::info('Apelación adicional procesada - manteniendo moderador actual');
                    
                    return redirect()->back()->with('success', 'Apelación enviada correctamente. El moderador asignado revisará tu caso.');
                } else {
                    // No hay moderador asignado, desasignar y buscar uno nuevo
                    $moderationCase->update([
                        'assigned_moderator_id' => null,
                        'assigned_at' => null,
                    ]);
                    
                    // Asignar a un moderador diferente
                    Log::info('Asignando apelación a moderador diferente');
                    $this->assignAppealToDifferentModerator($moderationCase, $originalModeratorId);
                    
                    DB::commit();
                    Log::info('Apelación procesada exitosamente');
                    
                    return redirect()->back()->with('success', 'Apelación enviada correctamente. Un moderador diferente revisará tu caso.');
                }
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al enviar apelación: ' . $e->getMessage(), [
                'exception' => $e->getTraceAsString(),
                'publication_id' => $id,
                'user_id' => Auth::id()
            ]);
            return redirect()->back()->withErrors(['error' => 'Error al enviar la apelación: ' . $e->getMessage()]);
        }
    }

    /**
     * Verificar si se puede apelar una publicación
     */
    public function canAppeal($id)
    {
        try {
            $publication = Publication::findOrFail($id);

            // Verificar que el usuario sea el propietario
            if ($publication->created_by !== Auth::id()) {
                return response()->json([
                    'can_appeal' => false,
                    'reason' => 'No tienes permisos para apelar esta publicación'
                ]);
            }

            // Verificar que la publicación esté oculta
            if (!$publication->is_hidden) {
                return response()->json([
                    'can_appeal' => false,
                    'reason' => 'Solo puedes apelar publicaciones que han sido ocultadas por moderación'
                ]);
            }

            // Buscar el caso de moderación
            $moderationCase = ModerationCase::where('publication_id', $id)->first();

            if (!$moderationCase) {
                return response()->json([
                    'can_appeal' => false,
                    'reason' => 'No se encontró un caso de moderación para esta publicación'
                ]);
            }

            // Verificar que el caso no haya llegado a una decisión final IRREVERSIBLE
            if ($moderationCase->status === 'action_taken') {
                return response()->json([
                    'can_appeal' => false,
                    'reason' => 'Este caso ya tiene una decisión final irreversible. No se pueden enviar más apelaciones.'
                ]);
            }

            // Para casos de auto-moderación, siempre permitir apelaciones
            // Identificar auto-moderación por metadata de la acción
            $hideAction = ModerationAction::where('moderation_case_id', $moderationCase->id)
                ->where('action_type', 'hide_publication')
                ->first();

            $isAutoModeration = false;
            if ($hideAction && isset($hideAction->metadata['auto_moderation']) && $hideAction->metadata['auto_moderation']) {
                $isAutoModeration = true;
            }

            if ($isAutoModeration) {
                return response()->json([
                    'can_appeal' => true,
                    'case_status' => $moderationCase->status,
                    'publication_hidden' => $publication->is_hidden,
                    'message' => 'Puedes apelar esta decisión de auto-moderación'
                ]);
            }

            // Verificar que el caso no esté cerrado (solo para casos normales)
            if ($moderationCase->status === 'closed') {
                return response()->json([
                    'can_appeal' => false,
                    'reason' => 'Este caso ya está cerrado. No se pueden enviar más apelaciones.'
                ]);
            }

            // Si el caso está en 'appealed', permitir múltiples apelaciones
            if ($moderationCase->status === 'appealed') {
                return response()->json([
                    'can_appeal' => true,
                    'case_status' => $moderationCase->status,
                    'publication_hidden' => $publication->is_hidden,
                    'message' => 'Puedes enviar múltiples apelaciones mientras el caso esté activo'
                ]);
            }

            // Si llegamos aquí, se puede apelar
            return response()->json([
                'can_appeal' => true,
                'case_status' => $moderationCase->status,
                'publication_hidden' => $publication->is_hidden,
                'message' => 'Puedes enviar una apelación para esta publicación'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'can_appeal' => false,
                'reason' => 'Error al verificar la apelación: ' . $e->getMessage()
            ]);
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

        // Buscar moderadores y admins diferentes al original (NO super_admin)
        $moderator = User::whereIn('role', ['moderador', 'admin']) // Solo moderadores y admins
            ->where('id', '!=', $originalModeratorId) // Excluir al moderador original
            ->where('status', StatusType::HABILITADO->value) // Solo activos
            ->where('is_active', true) // Solo activos
            ->withCount(['moderationCases' => function ($query) {
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
            'action_type' => 'close_case',
            'action_description' => 'Apelación en espera - No hay moderadores disponibles para revisar',
            'metadata' => [
                'original_moderator_id' => $originalModeratorId,
                'waiting_reason' => 'no_moderators_available',
                'status' => 'pending_moderator_assignment',
                'requires_manual_intervention' => true,
                'waiting_for_moderator' => true
            ]
        ]);
    }
}
