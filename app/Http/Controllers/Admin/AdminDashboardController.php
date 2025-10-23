<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HandlesMiddleware;
use App\Models\User;
use App\Enums\RoleType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    use HandlesMiddleware;

    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware(function ($request, $next) {
            if (!$request->user()->isAdministrative()) {
                abort(403, 'No tienes permisos para acceder al panel de administración.');
            }
            return $next($request);
        });
    }

    /**
     * Display the admin dashboard.
     */
    public function index()
    {
        $user = Auth::user();
        
        // Obtener estadísticas básicas
        $stats = [
            'totalAdmins' => 0,
            'activeAdmins' => 0,
            'totalModerators' => 0,
            'activeModerators' => 0,
            'recentActivity' => []
        ];

        // Solo Super Admin puede ver estadísticas de administradores
        if ($user->role === RoleType::SUPER_ADMIN->value) {
            $stats['totalAdmins'] = User::where('role', RoleType::ADMIN->value)->count();
            $stats['activeAdmins'] = User::where('role', RoleType::ADMIN->value)
                ->where('is_active', true)
                ->count();
        }

        // Ambos roles pueden ver estadísticas de moderadores
        $stats['totalModerators'] = User::where('role', RoleType::MODERADOR->value)->count();
        $stats['activeModerators'] = User::where('role', RoleType::MODERADOR->value)
            ->where('is_active', true)
            ->count();

        // Actividad reciente (simulada por ahora)
        $stats['recentActivity'] = [
            [
                'id' => 1,
                'action' => 'Usuario moderador creado',
                'user' => $user->name,
                'timestamp' => now()->subMinutes(5)->toISOString(),
            ],
            [
                'id' => 2,
                'action' => 'Estado de usuario actualizado',
                'user' => $user->name,
                'timestamp' => now()->subMinutes(15)->toISOString(),
            ],
            [
                'id' => 3,
                'action' => 'Sesión iniciada',
                'user' => $user->name,
                'timestamp' => now()->subMinutes(30)->toISOString(),
            ],
        ];

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
        ]);
    }
}
