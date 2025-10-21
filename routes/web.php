<?php

use App\Http\Controllers\ExampleController;
use App\Http\Controllers\PublicationController;
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
    Route::prefix('publication')->group(function () {
        Route::get('/', [PublicationController::class, 'index'])->name('publication-index');
        Route::get('/{id}', [PublicationController::class, 'view'])->name('publication-view');
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
