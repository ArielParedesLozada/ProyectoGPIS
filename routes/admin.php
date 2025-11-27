<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\ModeratorUserController;
use App\Http\Controllers\Admin\VendedorCompradorUserController;
use Illuminate\Support\Facades\Route;

// Rutas del módulo de administración
Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {

    Route::middleware(['is-superadmin'])->prefix('admins')->name('admin.')->group(function () {
        // Rutas para gestión de administradores (solo Super Admin)
        Route::get('/', [AdminUserController::class, 'index'])->name('index');
        Route::get('/create', [AdminUserController::class, 'create'])->name('create');
        Route::post('/', [AdminUserController::class, 'store'])->name('store');
        Route::get('/{admin}', [AdminUserController::class, 'show'])->name('show');
        Route::get('/{admin}/edit', [AdminUserController::class, 'edit'])->name('edit');
        Route::patch('/{admin}', [AdminUserController::class, 'update'])->name('update');
        Route::delete('/{admin}', [AdminUserController::class, 'destroy'])->name('destroy');
        Route::patch('/{admin}/toggle-status', [AdminUserController::class, 'toggleStatus'])->name('toggle-status');
        Route::get('/deleted', [AdminUserController::class, 'deleted'])->name('deleted');
        Route::patch('/{id}/restore', [AdminUserController::class, 'restore'])->name('restore');
        Route::delete('/{id}/force-delete', [AdminUserController::class, 'forceDelete'])->name('force-delete');
    });

    // Rutas para gestión de moderadores (Super Admin y Admin)
    Route::middleware(['can-manage-moderators'])->prefix('moderators')->name('moderators.')->group(function () {
        Route::get('/', [ModeratorUserController::class, 'index'])->name('index');
        Route::get('/create', [ModeratorUserController::class, 'create'])->name('create');
        Route::post('/', [ModeratorUserController::class, 'store'])->name('store');
        Route::get('/{moderator}', [ModeratorUserController::class, 'show'])->name('show');
        Route::get('/{moderator}/edit', [ModeratorUserController::class, 'edit'])->name('edit');
        Route::patch('/{moderator}', [ModeratorUserController::class, 'update'])->name('update');
        Route::delete('/{moderator}', [ModeratorUserController::class, 'destroy'])->name('destroy');
        Route::patch('/{moderator}/toggle-status', [ModeratorUserController::class, 'toggleStatus'])->name('toggle-status');
        Route::get('/deleted', [ModeratorUserController::class, 'deleted'])->name('deleted');
        Route::patch('/{id}/restore', [ModeratorUserController::class, 'restore'])->name('restore');
        Route::delete('/{id}/force-delete', [ModeratorUserController::class, 'forceDelete'])->name('force-delete');
        // Rutas para reasignación de casos de moderadores inactivos
        Route::post('/{moderator}/reassign-cases', [ModeratorUserController::class, 'reassignCases'])->name('reassign-cases');
        Route::get('/inactive-with-cases', [ModeratorUserController::class, 'getInactiveModeratorsWithCases'])->name('inactive-with-cases');
    });

    Route::middleware(['is-administrative'])->group(function () {
        // Dashboard de administración
        Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
        // Rutas para gestión de vendedores
        Route::get('/vendors', [VendedorCompradorUserController::class, 'indexVendors'])->name('vendors.index');
        Route::get('/vendors/{vendor}', [VendedorCompradorUserController::class, 'showVendor'])->name('vendors.show');
        Route::patch('/vendors/{vendor}/toggle-status', [VendedorCompradorUserController::class, 'toggleVendorStatus'])->name('vendors.toggle-status');

        // Rutas para gestión de compradores
        Route::get('/buyers', [VendedorCompradorUserController::class, 'indexBuyers'])->name('buyers.index');
        Route::get('/buyers/{buyer}', [VendedorCompradorUserController::class, 'showBuyer'])->name('buyers.show');
        Route::patch('/buyers/{buyer}/toggle-status', [VendedorCompradorUserController::class, 'toggleBuyerStatus'])->name('buyers.toggle-status');
    });
});
