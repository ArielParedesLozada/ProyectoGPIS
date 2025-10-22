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
            $userId = Auth::id();
            Log::info('store - User ID: ' . $userId);
            
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'price' => 'required|numeric|min:0',
                'category_id' => 'required|exists:categories,id',
                'type' => 'required|in:producto,servicio',
                'location' => 'required|string',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            ]);

        $publication = Publication::create([
            'code' => Str::uuid(),
            'title' => $request->title,
            'description' => $request->description,
            'price' => $request->price,
            'location' => $request->location, // Usar el texto de ubicación del usuario
            'disponibility' => true,
            'category_id' => $request->category_id,
            'created_by' => $userId,
            'status' => StatusType::HABILITADO,
            'type' => $request->type,
            'published_at' => now(),
        ]);

        // Guardar imágenes
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
            Log::error('Error creating publication: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al crear la publicación: ' . $e->getMessage()]);
        }
    }

    public function edit($id)
    {
        $publication = Publication::with(['category', 'images'])
            ->where('created_by', Auth::id())
            ->findOrFail($id);
        
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


            // Validación más flexible
            $validationRules = [
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
            ];

            // Solo validar campos que no están vacíos
            if ($request->filled('title')) {
                $validationRules['title'] = 'required|string|max:255';
            }
            if ($request->filled('description')) {
                $validationRules['description'] = 'required|string';
            }
            if ($request->filled('price')) {
                $validationRules['price'] = 'required|numeric|min:0';
            }
            if ($request->filled('category_id')) {
                $validationRules['category_id'] = 'required|exists:categories,id';
            }
            if ($request->filled('type')) {
                $validationRules['type'] = 'required|in:producto,servicio';
            }
            if ($request->filled('location')) {
                $validationRules['location'] = 'required|string';
            }

            $request->validate($validationRules);

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

            if (!empty($updateData)) {
                $publication->update($updateData);
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
            Log::error('Error updating publication: ' . $e->getMessage());
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
