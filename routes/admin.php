<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\ModeratorUserController;
use Illuminate\Support\Facades\Route;

// Rutas del módulo de administración
Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {
    
    // Dashboard de administración
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    
    // Rutas para gestión de administradores (solo Super Admin)
    Route::get('/admins', [AdminUserController::class, 'index'])->name('admins.index');
    Route::get('/admins/create', [AdminUserController::class, 'create'])->name('admins.create');
    Route::post('/admins', [AdminUserController::class, 'store'])->name('admins.store');
    Route::get('/admins/{admin}', [AdminUserController::class, 'show'])->name('admins.show');
    Route::get('/admins/{admin}/edit', [AdminUserController::class, 'edit'])->name('admins.edit');
    Route::patch('/admins/{admin}', [AdminUserController::class, 'update'])->name('admins.update');
    Route::delete('/admins/{admin}', [AdminUserController::class, 'destroy'])->name('admins.destroy');
    Route::patch('/admins/{admin}/toggle-status', [AdminUserController::class, 'toggleStatus'])->name('admins.toggle-status');
    Route::get('/admins/deleted', [AdminUserController::class, 'deleted'])->name('admins.deleted');
    Route::patch('/admins/{id}/restore', [AdminUserController::class, 'restore'])->name('admins.restore');
    Route::delete('/admins/{id}/force-delete', [AdminUserController::class, 'forceDelete'])->name('admins.force-delete');
    
    // Rutas para gestión de moderadores (Super Admin y Admin)
    Route::get('/moderators', [ModeratorUserController::class, 'index'])->name('moderators.index');
    Route::get('/moderators/create', [ModeratorUserController::class, 'create'])->name('moderators.create');
    Route::post('/moderators', [ModeratorUserController::class, 'store'])->name('moderators.store');
    Route::get('/moderators/{moderator}', [ModeratorUserController::class, 'show'])->name('moderators.show');
    Route::get('/moderators/{moderator}/edit', [ModeratorUserController::class, 'edit'])->name('moderators.edit');
    Route::patch('/moderators/{moderator}', [ModeratorUserController::class, 'update'])->name('moderators.update');
    Route::delete('/moderators/{moderator}', [ModeratorUserController::class, 'destroy'])->name('moderators.destroy');
    Route::patch('/moderators/{moderator}/toggle-status', [ModeratorUserController::class, 'toggleStatus'])->name('moderators.toggle-status');
    Route::get('/moderators/deleted', [ModeratorUserController::class, 'deleted'])->name('moderators.deleted');
    Route::patch('/moderators/{id}/restore', [ModeratorUserController::class, 'restore'])->name('moderators.restore');
    Route::delete('/moderators/{id}/force-delete', [ModeratorUserController::class, 'forceDelete'])->name('moderators.force-delete');
});
