<?php

namespace App\Http\Controllers;

use App\Enums\StatusType;
use App\Enums\PublicationType;
use App\Models\Category;
use App\Models\Publication;
use App\Models\PublicationImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Clickbar\Magellan\Data\Geometries\Point;

class PublicationController extends Controller
{
    public function index(Request $request)
    {
        $query = Publication::query()->with('category');
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

            $publications = $query->orderBy('created_at', 'desc')->paginate(12)->withQueryString();
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

    public function store(Request $request)
    {
        try {
            // Validación original que funcionaba
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'price' => 'required|numeric|min:0',
                'category_id' => 'required|exists:categories,id',
                'type' => 'required|in:producto,servicio',
                'location' => 'required|string',
                'lat' => 'nullable|numeric|between:-90,90',
                'lng' => 'nullable|numeric|between:-180,180',
                'horario' => 'nullable|string|max:255',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->horario)) {
                return redirect()->back()->withErrors(['horario' => 'El horario es obligatorio para servicios.']);
            }

            $userId = Auth::id();
            $publicationData = [
                'code' => Str::uuid(),
                'title' => $request->title,
                'description' => $request->description,
                'price' => $request->price,
                'location' => $request->location, // Usar el texto de ubicación del usuario
                'disponibility' => true,
                'category_id' => $request->category_id,
                'created_by' => $userId,
                'status' => StatusType::HABILITADO, // Siempre crear como HABILITADO
                'type' => $request->type,
                'published_at' => now(),
                'horario' => $request->horario,
            ];


            // Agregar coordenadas geográficas si están disponibles
            if ($request->filled('lat') && $request->filled('lng') && is_numeric($request->lat) && is_numeric($request->lng)) {
                try {
                    // Crear Point sin dimensión Z (lng, lat) - PostGIS usa longitud primero
                    $publicationData['location_point'] = Point::make($request->lng, $request->lat);
                } catch (\Exception $e) {
                    // Error creating Point - continue without location
                }
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
        $coords = \DB::selectOne("SELECT ST_X(location_point::geometry) as lng, ST_Y(location_point::geometry) as lat FROM publications WHERE id = ?", [$id]);
        
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


            // Validación original que funcionaba
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'price' => 'required|numeric|min:0',
                'category_id' => 'required|exists:categories,id',
                'type' => 'required|in:producto,servicio',
                'location' => 'required|string',
                'lat' => 'nullable|numeric|between:-90,90',
                'lng' => 'nullable|numeric|between:-180,180',
                'horario' => 'nullable|string|max:255',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);

            // Validar horario requerido para servicios
            if ($request->type === 'servicio' && empty($request->horario)) {
                return redirect()->back()->withErrors(['horario' => 'El horario es obligatorio para servicios.']);
            }

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
            if ($request->filled('location')) {
                $updateData['location'] = $request->location;
            }
            if ($request->filled('horario')) {
                $updateData['horario'] = $request->horario;
            }

            // Actualizar coordenadas geográficas si están disponibles
            if ($request->filled('lat') && $request->filled('lng') && is_numeric($request->lat) && is_numeric($request->lng)) {
                try {
                    // Crear Point sin dimensión Z (solo lat, lng)
                    $updateData['location_point'] = Point::make($request->lng, $request->lat);
                } catch (\Exception $e) {
                    // Error creating Point - continue without location
                }
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
                    \Storage::disk('public')->delete($image->image_url);
                    // Eliminar de la base de datos
                    $image->delete();
                }
            } else {
                // Si no se envían existing_images, eliminar todas las imágenes existentes
                foreach ($publication->images as $image) {
                    \Storage::disk('public')->delete($image->image_url);
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
}
