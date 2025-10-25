<?php

use App\Http\Controllers\ExampleController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\ModerationController;
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
        Route::post('/{id}/report', [PublicationController::class, 'report'])->name('publication-report');
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
        Route::post('/{id}/appeal', [PublicationController::class, 'appeal'])->name('publications.appeal');
        Route::get('/{id}/can-appeal', [PublicationController::class, 'canAppeal'])->name('publications.can-appeal');
        Route::get('/{id}', [PublicationController::class, 'myView'])->name('my-publication-view');
    });

    // Rutas para Moderación
    Route::prefix('moderation')->middleware('auth')->group(function () {
        Route::get('/', [ModerationController::class, 'index'])->name('moderation.index');
        Route::get('/{id}', [ModerationController::class, 'show'])->name('moderation.show');
        Route::post('/{id}/assign-to-me', [ModerationController::class, 'assignToMe'])->name('moderation.assign-to-me');
        Route::post('/{id}/hide-publication', [ModerationController::class, 'hidePublication'])->name('moderation.hide-publication');
        Route::post('/{id}/restore-publication', [ModerationController::class, 'restorePublication'])->name('moderation.restore-publication');
        Route::post('/{id}/dismiss', [ModerationController::class, 'dismissCase'])->name('moderation.dismiss');
        Route::post('/{id}/review-appeal', [ModerationController::class, 'reviewAppeal'])->name('moderation.review-appeal');
    });
    
    // Rutas para Favoritos
    Route::prefix('favorites')->group(function () {
        Route::get('/', [PublicationController::class, 'favorites'])->name('favorites');
        Route::post('/{id}', [PublicationController::class, 'addToFavorites'])->name('favorites.add');
        Route::delete('/{id}', [PublicationController::class, 'removeFromFavorites'])->name('favorites.remove');
        Route::get('/check/{id}', [PublicationController::class, 'checkFavorite'])->name('favorites.check');
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/admin.php';
