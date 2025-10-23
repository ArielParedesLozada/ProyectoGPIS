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
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    
    Route::prefix('publication')->group(function () {
        Route::get('/', [PublicationController::class, 'index'])->name('publication-index');
        Route::get('/{id}', [PublicationController::class, 'view'])->name('publication-view');
    });
    
    // Rutas para Mis Publicaciones
    Route::prefix('my-publications')->group(function () {
        Route::get('/', [PublicationController::class, 'myPublications'])->name('my-publications');
        Route::get('/create', [PublicationController::class, 'create'])->name('publications.create');
        Route::post('/', [PublicationController::class, 'store'])->name('publications.store');
        Route::get('/{id}/edit', [PublicationController::class, 'edit'])->name('publications.edit');
        Route::patch('/{id}/toggle-status', [PublicationController::class, 'toggleStatus'])->name('publications.toggle-status');
        Route::put('/{id}', [PublicationController::class, 'update'])->name('publications.update');
        Route::delete('/{id}', [PublicationController::class, 'destroy'])->name('publications.destroy');
        Route::get('/{id}', [PublicationController::class, 'myView'])->name('my-publication-view');
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/admin.php';
