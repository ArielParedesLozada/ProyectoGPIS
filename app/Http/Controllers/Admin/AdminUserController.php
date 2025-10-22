<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RoleType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HandlesMiddleware;
use App\Http\Requests\Admin\CreateAdminRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AdminUserController extends Controller
{
    use HandlesMiddleware;
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware(function ($request, $next) {
            if (!$request->user()->canManageAdmins()) {
                abort(403, 'No tienes permisos para gestionar administradores.');
            }
            return $next($request);
        });
    }

    /**
     * Display a listing of admin users.
     */
    public function index()
    {
        $admins = User::where('role', RoleType::ADMIN->value)
            ->select('id', 'name', 'surname', 'email', 'is_active', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('admin/admin-users', [
            'admins' => $admins,
        ]);
    }

    /**
     * Show the form for creating a new admin.
     */
    public function create()
    {
        return Inertia::render('admin/create-admin');
    }

    /**
     * Store a newly created admin.
     */
    public function store(CreateAdminRequest $request)
    {
        try {
            $admin = User::create([
                'cedula' => $request->cedula,
                'name' => $request->name,
                'surname' => $request->surname,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'address' => $request->address,
                'gender' => $request->gender,
                'role' => RoleType::ADMIN->value,
                'status' => 1, // HABILITADO
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            Log::info('Admin creado exitosamente', [
                'admin_id' => $admin->id,
                'email' => $admin->email,
                'created_by' => Auth::id(),
            ]);

            return redirect()->route('admin.admins.index')
                ->with('success', 'Administrador creado exitosamente.');

        } catch (\Exception $e) {
            Log::error('Error al crear administrador', [
                'error' => $e->getMessage(),
                'request_data' => $request->validated(),
                'created_by' => Auth::id(),
            ]);

            return back()->withErrors([
                'general' => 'Ocurrió un error al crear el administrador. Por favor, inténtalo de nuevo.'
            ]);
        }
    }

    /**
     * Toggle admin active status.
     */
    public function toggleStatus(User $admin)
    {
        Log::info('Toggle status attempt', [
            'admin_id' => $admin->id,
            'current_status' => $admin->is_active,
            'user_id' => Auth::id(),
        ]);
        
        // Verificar que el usuario sea realmente un admin
        if ($admin->role !== RoleType::ADMIN->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // No permitir desactivar el propio usuario
        if ($admin->id === Auth::id()) {
            return back()->withErrors([
                'general' => 'No puedes desactivar tu propia cuenta.'
            ]);
        }

        try {
            $admin->update([
                'is_active' => !$admin->is_active
            ]);

            $status = $admin->is_active ? 'activado' : 'desactivado';
            
            Log::info("Admin {$status}", [
                'admin_id' => $admin->id,
                'email' => $admin->email,
                'is_active' => $admin->is_active,
                'updated_by' => Auth::id(),
            ]);

            return back()->with('success', "Administrador {$status} exitosamente.");

        } catch (\Exception $e) {
            Log::error('Error al cambiar estado del administrador', [
                'admin_id' => $admin->id,
                'error' => $e->getMessage(),
                'updated_by' => Auth::id(),
            ]);

            return back()->withErrors([
                'general' => 'Ocurrió un error al cambiar el estado del administrador.'
            ]);
        }
    }
}
