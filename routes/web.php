<?php

use App\Http\Controllers\ExampleController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/testing', function () {
    return response()->json([
        'data' => 'ok'
    ]);
});
Route::get('/test', [ExampleController::class, 'index'])->name('test');

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('welcome');

//Rutas verificadas
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/home', [UserController::class, 'home'])->name('home');
    Route::get('/product/{id}', [ProductController::class, 'view'])->name('product-view');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
