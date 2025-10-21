<?php

namespace App\Http\Controllers;

use App\Enums\StatusType;
use App\Models\Category;
use App\Models\Publication;
use Illuminate\Http\Request;
use Inertia\Inertia;

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
        $query->where('status', StatusType::HABILITADO);

        $publications = $query->paginate(6)->withQueryString();

        $categories = Category::select('id', 'name')->get();

        return Inertia::render('publications/publication-index', [
            'publications' => $publications,
            'categories' => $categories,
            'selectedCategory' => $request->category_id,
            'selectedType' => $request->type,
        ]);
    }

    public function view($id)
    {
        $publication = Publication::with(['user', 'category'])->findOrFail($id);
        return Inertia::render('publications/publication-view', [
            'publication' => $publication
        ]);
    }
}
