<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ExampleController extends Controller
{
    public function index()
    {
        $homeData = ['data' => 'ok'];
        return Inertia::render('Test', [
            'homeData' => $homeData,
            'additionalData' => 'Información adicional'
        ]);
    }
}
