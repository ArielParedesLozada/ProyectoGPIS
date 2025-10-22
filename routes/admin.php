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
    Route::patch('/admins/{admin}/toggle-status', [AdminUserController::class, 'toggleStatus'])->name('admins.toggle-status');
    
    // Rutas para gestión de moderadores (Super Admin y Admin)
    Route::get('/moderators', [ModeratorUserController::class, 'index'])->name('moderators.index');
    Route::get('/moderators/create', [ModeratorUserController::class, 'create'])->name('moderators.create');
    Route::post('/moderators', [ModeratorUserController::class, 'store'])->name('moderators.store');
    Route::patch('/moderators/{moderator}/toggle-status', [ModeratorUserController::class, 'toggleStatus'])->name('moderators.toggle-status');
});
