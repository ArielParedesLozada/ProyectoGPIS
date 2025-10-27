<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HandlesMiddleware;
use App\Models\User;
use App\Models\Publication;
use App\Enums\RoleType;
use App\Enums\StatusType;
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
            'totalPublications' => 0,
            'activePublications' => 0,
            'inactivePublications' => 0,
            'hiddenPublications' => 0,
            'lastAdminActivity' => null,
            'lastModeratorActivity' => null,
            'pendingModerationTasks' => 0,
            'totalUsers' => 0,
            'activeUsers' => 0,
            'inactiveUsers' => 0,
            'newUsersThisWeek' => 0,
            'recentActivity' => []
        ];

        // Solo Super Admin puede ver estadísticas de administradores
        if ($user->role === RoleType::SUPER_ADMIN->value) {
            $stats['totalAdmins'] = User::where('role', RoleType::ADMIN->value)->count();
            $stats['activeAdmins'] = User::where('role', RoleType::ADMIN->value)
                ->where('is_active', true)
                ->count();
            
            // Obtener última actividad de administradores
            $lastAdmin = User::where('role', RoleType::ADMIN->value)
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->first();
            $stats['lastAdminActivity'] = $lastAdmin ? $lastAdmin->updated_at : null;
        }

        // Ambos roles pueden ver estadísticas de moderadores
        $stats['totalModerators'] = User::where('role', RoleType::MODERADOR->value)->count();
        $stats['activeModerators'] = User::where('role', RoleType::MODERADOR->value)
            ->where('is_active', true)
            ->count();
        
        // Obtener última actividad de moderadores
        $lastModerator = User::where('role', RoleType::MODERADOR->value)
            ->where('is_active', true)
            ->orderBy('updated_at', 'desc')
            ->first();
        $stats['lastModeratorActivity'] = $lastModerator ? $lastModerator->updated_at : null;
        
        // Contar tareas de moderación pendientes (casos abiertos)
        $stats['pendingModerationTasks'] = \App\Models\ModerationCase::whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])->count();

        // Estadísticas generales de usuarios
        $stats['totalUsers'] = User::whereIn('role', [RoleType::VENDEDOR->value, RoleType::COMPRADOR->value])->count();
        $stats['activeUsers'] = User::whereIn('role', [RoleType::VENDEDOR->value, RoleType::COMPRADOR->value])
            ->where('is_active', true)
            ->count();
        $stats['inactiveUsers'] = User::whereIn('role', [RoleType::VENDEDOR->value, RoleType::COMPRADOR->value])
            ->where('is_active', false)
            ->count();
        $stats['newUsersThisWeek'] = User::whereIn('role', [RoleType::VENDEDOR->value, RoleType::COMPRADOR->value])
            ->where('created_at', '>=', now()->subWeek())
            ->count();

        // Estadísticas de publicaciones
        $stats['totalPublications'] = Publication::count();
        $stats['activePublications'] = Publication::where('status', StatusType::HABILITADO)
            ->where('is_hidden', false)
            ->count();
        $stats['inactivePublications'] = Publication::where('status', StatusType::INHABILITADO)->count();
        $stats['hiddenPublications'] = Publication::where('is_hidden', true)->count();

        // Actividad reciente real
        $stats['recentActivity'] = [];
        
        // Obtener actividad reciente de moderación
        $recentModerationActions = \App\Models\ModerationAction::with('moderator')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
            
        foreach ($recentModerationActions as $action) {
            $stats['recentActivity'][] = [
                'id' => $action->id,
                'action' => $this->getActionDescription($action->action_type),
                'user' => $action->moderator ? $action->moderator->name : 'Sistema',
                'timestamp' => $action->created_at->toISOString(),
            ];
        }
        
        // Si no hay actividad de moderación, agregar actividad de usuarios recientes
        if (empty($stats['recentActivity'])) {
            $recentUsers = User::whereIn('role', [RoleType::ADMIN->value, RoleType::MODERADOR->value, RoleType::VENDEDOR->value, RoleType::COMPRADOR->value])
                ->orderBy('updated_at', 'desc')
                ->limit(3)
                ->get();
                
            foreach ($recentUsers as $recentUser) {
                $roleName = match($recentUser->role) {
                    RoleType::ADMIN->value => 'administrador',
                    RoleType::MODERADOR->value => 'moderador',
                    RoleType::VENDEDOR->value => 'vendedor',
                    RoleType::COMPRADOR->value => 'comprador',
                    default => 'usuario'
                };
                
                $stats['recentActivity'][] = [
                    'id' => $recentUser->id,
                    'action' => 'Usuario ' . $roleName . ' actualizado',
                    'user' => $recentUser->name,
                    'timestamp' => $recentUser->updated_at->toISOString(),
                ];
            }
        }

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
        ]);
    }

    /**
     * Obtener descripción legible de una acción de moderación
     */
    private function getActionDescription($actionType)
    {
        $descriptions = [
            'hide_publication' => 'Publicación ocultada',
            'show_publication' => 'Publicación mostrada',
            'close_case' => 'Caso cerrado',
            'reopen_case' => 'Caso reabierto',
            'assign_moderator' => 'Moderador asignado',
            'dismiss_case' => 'Caso desestimado',
            'escalate_case' => 'Caso escalado',
        ];

        return $descriptions[$actionType] ?? 'Acción realizada';
    }
}
