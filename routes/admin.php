<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\ModeratorUserController;
use App\Http\Controllers\Admin\VendedorCompradorUserController;
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
    
    // Rutas para reasignación de casos de moderadores inactivos
    Route::post('/moderators/{moderator}/reassign-cases', [ModeratorUserController::class, 'reassignCases'])->name('moderators.reassign-cases');
    Route::get('/moderators/inactive-with-cases', [ModeratorUserController::class, 'getInactiveModeratorsWithCases'])->name('moderators.inactive-with-cases');
    
    // Rutas para gestión de vendedores
    Route::get('/vendors', [VendedorCompradorUserController::class, 'indexVendors'])->name('vendors.index');
    Route::get('/vendors/{vendor}', [VendedorCompradorUserController::class, 'showVendor'])->name('vendors.show');
    Route::patch('/vendors/{vendor}/toggle-status', [VendedorCompradorUserController::class, 'toggleVendorStatus'])->name('vendors.toggle-status');
    
    // Rutas para gestión de compradores
    Route::get('/buyers', [VendedorCompradorUserController::class, 'indexBuyers'])->name('buyers.index');
    Route::get('/buyers/{buyer}', [VendedorCompradorUserController::class, 'showBuyer'])->name('buyers.show');
    Route::patch('/buyers/{buyer}/toggle-status', [VendedorCompradorUserController::class, 'toggleBuyerStatus'])->name('buyers.toggle-status');
});
