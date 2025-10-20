<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function view($id)
    {
        $product = Product::with(['user', 'category'])->findOrFail($id);
        return Inertia::render('product-view', [
            'product' => $product
        ]);
    }
}
