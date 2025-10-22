<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RoleType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HandlesMiddleware;
use App\Http\Requests\Admin\CreateModeratorRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ModeratorUserController extends Controller
{
    use HandlesMiddleware;
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware(function ($request, $next) {
            if (!$request->user()->canManageModerators()) {
                abort(403, 'No tienes permisos para gestionar moderadores.');
            }
            return $next($request);
        });
    }

    /**
     * Display a listing of moderator users.
     */
    public function index()
    {
        $moderators = User::where('role', RoleType::MODERADOR->value)
            ->select('id', 'name', 'surname', 'email', 'is_active', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('admin/moderator-users', [
            'moderators' => $moderators,
        ]);
    }

    /**
     * Show the form for creating a new moderator.
     */
    public function create()
    {
        return Inertia::render('admin/create-moderator');
    }

    /**
     * Store a newly created moderator.
     */
    public function store(CreateModeratorRequest $request)
    {
        Log::info('Moderator creation attempt', [
            'request_data' => $request->all(),
            'user_id' => Auth::id(),
            'user_role' => Auth::user()->role,
        ]);
        
        try {
            $moderator = User::create([
                'cedula' => $request->cedula,
                'name' => $request->name,
                'surname' => $request->surname,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'address' => $request->address,
                'gender' => $request->gender,
                'role' => RoleType::MODERADOR->value,
                'status' => 1, // HABILITADO
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            Log::info('Moderador creado exitosamente', [
                'moderator_id' => $moderator->id,
                'email' => $moderator->email,
                'created_by' => Auth::id(),
            ]);

            return redirect()->route('admin.moderators.index')
                ->with('success', 'Moderador creado exitosamente.');

        } catch (\Exception $e) {
            Log::error('Error al crear moderador', [
                'error' => $e->getMessage(),
                'request_data' => $request->validated(),
                'created_by' => Auth::id(),
            ]);

            return back()->withErrors([
                'general' => 'Ocurrió un error al crear el moderador. Por favor, inténtalo de nuevo.'
            ]);
        }
    }

    /**
     * Toggle moderator active status.
     */
    public function toggleStatus(User $moderator)
    {
        Log::info('Toggle status attempt', [
            'moderator_id' => $moderator->id,
            'current_status' => $moderator->is_active,
            'user_id' => Auth::id(),
        ]);
        
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // No permitir desactivar el propio usuario
        if ($moderator->id === Auth::id()) {
            return back()->withErrors([
                'general' => 'No puedes desactivar tu propia cuenta.'
            ]);
        }

        try {
            $moderator->update([
                'is_active' => !$moderator->is_active
            ]);

            $status = $moderator->is_active ? 'activado' : 'desactivado';
            
            Log::info("Moderador {$status}", [
                'moderator_id' => $moderator->id,
                'email' => $moderator->email,
                'is_active' => $moderator->is_active,
                'updated_by' => Auth::id(),
            ]);

            return back()->with('success', "Moderador {$status} exitosamente.");

        } catch (\Exception $e) {
            Log::error('Error al cambiar estado del moderador', [
                'moderator_id' => $moderator->id,
                'error' => $e->getMessage(),
                'updated_by' => Auth::id(),
            ]);

            return back()->withErrors([
                'general' => 'Ocurrió un error al cambiar el estado del moderador.'
            ]);
        }
    }
}
