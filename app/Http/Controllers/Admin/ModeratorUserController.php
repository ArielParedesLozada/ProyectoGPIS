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

    /**
     * Display the specified moderator user.
     */
    public function show(User $moderator)
    {
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        return Inertia::render('admin/moderator-details', [
            'moderator' => $moderator,
        ]);
    }

    /**
     * Show the form for editing the specified moderator user.
     */
    public function edit(User $moderator)
    {
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        return Inertia::render('admin/edit-moderator', [
            'moderator' => $moderator,
        ]);
    }

    /**
     * Update the specified moderator user.
     */
    public function update(Request $request, User $moderator)
    {
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        $request->validate([
            'cedula' => 'required|string|max:10|unique:users,cedula,' . $moderator->id,
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'phone' => 'required|string|max:10|unique:users,phone,' . $moderator->id,
            'address' => 'required|string|max:255',
            'gender' => 'required|in:hombre,mujer',
            'email' => 'required|string|email|max:255|unique:users,email,' . $moderator->id,
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $data = $request->only([
            'cedula', 'name', 'surname', 'phone', 'address', 'gender', 'email'
        ]);

        // Solo actualizar la contraseña si se proporciona
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $moderator->update($data);

        return redirect()->route('admin.moderators.index')->with('success', 'Moderador actualizado exitosamente.');
    }

    /**
     * Remove the specified moderator user.
     */
    public function destroy(User $moderator)
    {
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        // No permitir eliminar el propio usuario
        if ($moderator->id === Auth::id()) {
            return back()->withErrors([
                'general' => 'No puedes eliminar tu propia cuenta.'
            ]);
        }

        $moderator->delete();

        return redirect()->route('admin.moderators.index')->with('success', 'Moderador eliminado exitosamente.');
    }

    /**
     * Display a listing of deleted moderator users.
     */
    public function deleted()
    {
        $deletedModerators = User::onlyTrashed()
            ->where('role', RoleType::MODERADOR->value)
            ->select('id', 'name', 'surname', 'email', 'is_active', 'created_at', 'deleted_at')
            ->orderBy('deleted_at', 'desc')
            ->paginate(10);

        return Inertia::render('admin/deleted-moderators', [
            'deletedModerators' => $deletedModerators,
        ]);
    }

    /**
     * Restore the specified deleted moderator user.
     */
    public function restore($id)
    {
        $moderator = User::onlyTrashed()->findOrFail($id);
        
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        $moderator->restore();

        return redirect()->route('admin.moderators.deleted')->with('success', 'Moderador restaurado exitosamente.');
    }

    /**
     * Permanently delete the specified moderator user.
     */
    public function forceDelete($id)
    {
        $moderator = User::onlyTrashed()->findOrFail($id);
        
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        $moderator->forceDelete();

        return redirect()->route('admin.moderators.deleted')->with('success', 'Moderador eliminado permanentemente.');
    }

    /**
     * Reasignar casos de un moderador inactivo
     */
    public function reassignCases(User $moderator)
    {
        // Verificar que el usuario sea realmente un moderador
        if ($moderator->role !== RoleType::MODERADOR->value) {
            abort(404, 'Usuario no encontrado.');
        }

        try {
            // Despachar job para reasignación automática
            \App\Jobs\ReassignModeratorCasesJob::dispatch($moderator->id);

            Log::info("Reasignación manual iniciada para moderador", [
                'moderator_id' => $moderator->id,
                'moderator_name' => $moderator->name . ' ' . $moderator->surname,
                'initiated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Reasignación iniciada. Los casos se procesarán en segundo plano.'
            ]);

        } catch (\Exception $e) {
            Log::error("Error al iniciar reasignación para moderador {$moderator->id}: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al iniciar la reasignación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener moderadores inactivos con casos asignados
     */
    public function getInactiveModeratorsWithCases()
    {
        $inactiveModerators = User::where('role', RoleType::MODERADOR->value)
            ->where(function($query) {
                $query->where('status', 0) // INHABILITADO
                      ->orWhere('is_active', false);
            })
            ->whereHas('moderationCases', function($q) {
                $q->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            })
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->select('id', 'name', 'surname', 'email', 'status', 'is_active', 'created_at')
            ->get();

        return response()->json([
            'inactive_moderators' => $inactiveModerators,
            'total_count' => $inactiveModerators->count(),
            'total_cases' => $inactiveModerators->sum('moderation_cases_count')
        ]);
    }
}
