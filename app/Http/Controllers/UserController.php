<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function home()
    {
        $products = Product::paginate(6);
        return Inertia::render('home', [
            'products' => $products
        ]);
    }
}
