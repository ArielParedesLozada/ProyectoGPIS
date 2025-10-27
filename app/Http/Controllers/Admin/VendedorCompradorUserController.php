<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RoleType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HandlesMiddleware;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class VendedorCompradorUserController extends Controller
{
    use HandlesMiddleware;
    
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware(function ($request, $next) {
            // Permitir acceso a super_admin, admin y moderador
            if (!$request->user()->isAdministrative()) {
                abort(403, 'No tienes permisos para gestionar usuarios.');
            }
            return $next($request);
        });
    }

    /**
     * Display a listing of vendor users.
     */
    public function indexVendors()
    {
        $vendors = User::where('role', RoleType::VENDEDOR->value)
            ->select('id', 'name', 'surname', 'email', 'phone', 'is_active', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('admin/vendor-users', [
            'vendors' => $vendors,
        ]);
    }

    /**
     * Display a listing of buyer users.
     */
    public function indexBuyers()
    {
        $buyers = User::where('role', RoleType::COMPRADOR->value)
            ->select('id', 'name', 'surname', 'email', 'phone', 'is_active', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('admin/buyer-users', [
            'buyers' => $buyers,
        ]);
    }

    /**
     * Toggle vendor active status.
     */
    public function toggleVendorStatus(User $vendor)
    {
        Log::info('Toggle status attempt', [
            'vendor_id' => $vendor->id,
            'current_status' => $vendor->is_active,
            'user_id' => Auth::id(),
        ]);

        // Verificar que el usuario sea realmente un vendedor
        if ($vendor->role !== RoleType::VENDEDOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // No permitir desactivar el propio usuario
        if ($vendor->id === Auth::id()) {
            return back()->withErrors([
                'general' => 'No puedes desactivar tu propia cuenta.'
            ]);
        }

        try {
            $vendor->update([
                'is_active' => !$vendor->is_active
            ]);

            $status = $vendor->is_active ? 'activado' : 'desactivado';

            Log::info("Vendedor {$status}", [
                'vendor_id' => $vendor->id,
                'email' => $vendor->email,
                'is_active' => $vendor->is_active,
                'updated_by' => Auth::id(),
            ]);

            return back()->with('success', "Vendedor {$status} exitosamente.");
        } catch (\Exception $e) {
            Log::error('Error al cambiar estado del vendedor', [
                'vendor_id' => $vendor->id,
                'error' => $e->getMessage(),
                'updated_by' => Auth::id(),
            ]);

            return back()->withErrors([
                'general' => 'Ocurrió un error al cambiar el estado del vendedor.'
            ]);
        }
    }

    /**
     * Toggle buyer active status.
     */
    public function toggleBuyerStatus(User $buyer)
    {
        Log::info('Toggle status attempt', [
            'buyer_id' => $buyer->id,
            'current_status' => $buyer->is_active,
            'user_id' => Auth::id(),
        ]);

        // Verificar que el usuario sea realmente un comprador
        if ($buyer->role !== RoleType::COMPRADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // No permitir desactivar el propio usuario
        if ($buyer->id === Auth::id()) {
            return back()->withErrors([
                'general' => 'No puedes desactivar tu propia cuenta.'
            ]);
        }

        try {
            $buyer->update([
                'is_active' => !$buyer->is_active
            ]);

            $status = $buyer->is_active ? 'activado' : 'desactivado';

            Log::info("Comprador {$status}", [
                'buyer_id' => $buyer->id,
                'email' => $buyer->email,
                'is_active' => $buyer->is_active,
                'updated_by' => Auth::id(),
            ]);

            return back()->with('success', "Comprador {$status} exitosamente.");
        } catch (\Exception $e) {
            Log::error('Error al cambiar estado del comprador', [
                'buyer_id' => $buyer->id,
                'error' => $e->getMessage(),
                'updated_by' => Auth::id(),
            ]);

            return back()->withErrors([
                'general' => 'Ocurrió un error al cambiar el estado del comprador.'
            ]);
        }
    }

    /**
     * Display the specified vendor user.
     */
    public function showVendor(User $vendor)
    {
        // Verificar que el usuario sea realmente un vendedor
        if ($vendor->role !== RoleType::VENDEDOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // Cargar estadísticas relacionadas
        $vendor->loadCount('publications');

        return Inertia::render('admin/vendor-details', [
            'vendor' => $vendor,
        ]);
    }

    /**
     * Display the specified buyer user.
     */
    public function showBuyer(User $buyer)
    {
        // Verificar que el usuario sea realmente un comprador
        if ($buyer->role !== RoleType::COMPRADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // Cargar estadísticas relacionadas
        $buyer->loadCount('favorites');

        return Inertia::render('admin/buyer-details', [
            'buyer' => $buyer,
        ]);
    }
}

