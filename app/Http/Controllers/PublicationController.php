<?php

namespace App\Http\Controllers;

use App\Enums\StatusType;
use App\Enums\PublicationType;
use App\Models\Category;
use App\Models\Favorite;
use App\Models\Publication;
use App\Models\PublicationImage;
use App\Models\PublicationServiceHour;
use App\Services\GeocodingService;
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
        
        $query->where('status', StatusType::HABILITADO);

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
                ->with(['category', 'images'])
                ->where('created_by', $userId);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $publications = $query->orderBy('created_at', 'desc')->paginate(9)->withQueryString();
            
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

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->schedule)) {
                return redirect()->back()->withErrors(['schedule' => 'El horario es obligatorio para servicios.']);
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
                // El horario se manejará por separado con serviceHours
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

            // Guardar horarios de servicio si es tipo servicio
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

            return redirect()->route('my-publications')->with('success', 'Publicación creada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al crear la publicación: ' . $e->getMessage()]);
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

        return redirect()->route('my-publications')->with('success', 
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
                
            // Forzar serialización correcta
            $publicationData = $publication->toArray();
            $publicationData['serviceHours'] = $publication->serviceHours->toArray();
            
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
            $favorites = Auth::user()->favorites()
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
}
