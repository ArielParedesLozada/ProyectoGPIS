<?php

namespace App\Http\Controllers;

use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\Publication;
use App\Models\User;
use App\Enums\StatusType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ModerationController extends Controller
{
    public function __construct()
    {
        // Los middlewares se definen en las rutas
    }

    /**
     * Verificar permisos de moderador
     */
    private function checkModeratorPermissions()
    {
        if (!in_array(Auth::user()->role, ['moderador', 'admin', 'super_admin'])) {
            abort(403, 'No tienes permisos para acceder a esta sección');
        }
    }

    /**
     * Mostrar la bandeja de casos de moderación
     */
    public function index(Request $request)
    {
        $this->checkModeratorPermissions();
        
        $query = ModerationCase::with(['publication.category', 'assignedModerator', 'reports.reporter'])
            ->orderBy('created_at', 'desc');

        // Filtros
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('assigned_to_me')) {
            $query->where('assigned_moderator_id', Auth::id());
        }

        if ($request->filled('unassigned')) {
            $query->whereNull('assigned_moderator_id');
        }

        if ($request->filled('category_id')) {
            $query->whereHas('publication', function($q) use ($request) {
                $q->where('category_id', $request->category_id);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $cases = $query->paginate(15);

        // Estadísticas
        $stats = [
            'total_cases' => ModerationCase::count(),
            'pending_cases' => ModerationCase::where('status', 'pending')->count(),
            'in_review_cases' => ModerationCase::where('status', 'in_review')->count(),
            'appealed_cases' => ModerationCase::where('status', 'appealed')->count(),
            'my_cases' => ModerationCase::where('assigned_moderator_id', Auth::id())
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->count(),
            'unassigned_cases' => ModerationCase::whereNull('assigned_moderator_id')
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->count(),
            'pending_appeals' => ModerationAppeal::whereNull('reviewed_at')->count(),
        ];

        return Inertia::render('moderation/index', [
            'cases' => $cases,
            'stats' => $stats,
            'filters' => $request->only(['status', 'source', 'assigned_to_me', 'unassigned', 'category_id', 'date_from', 'date_to']),
        ]);
    }

    /**
     * Mostrar detalles de un caso específico
     */
    public function show($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::with([
            'publication.category',
            'publication.user',
            'publication.images',
            'assignedModerator',
            'reports.reporter',
            'actions.moderator',
            'appeals.appealer',
            'appeals.reviewingModerator'
        ])->findOrFail($id);

        // Determinar qué botones deben estar habilitados/deshabilitados
        $buttonStates = $this->getButtonStates($case);

        return Inertia::render('moderation/show', [
            'case' => $case,
            'buttonStates' => $buttonStates,
        ]);
    }

    /**
     * Determinar el estado de los botones según el caso y el moderador actual
     */
    private function getButtonStates($case)
    {
        $currentUserId = Auth::id();
        $isAssignedToMe = $case->assigned_moderator_id === $currentUserId;
        $isAppealed = $case->status === 'appealed';
        $isCompleted = in_array($case->status, ['closed', 'action_taken']);
        $hasAppeal = $case->appeals()->whereNull('reviewed_at')->exists();

        // Lógica estricta: Solo permitir acciones si está asignado a mí Y no está completado
        $canPerformActions = $isAssignedToMe && !$isCompleted;

        return [
            'canHidePublication' => $canPerformActions && !$isAppealed && !$hasAppeal,
            'canRestorePublication' => $canPerformActions && !$isCompleted,
            'canDismissCase' => $canPerformActions && !$isCompleted,
            'isAssignedToMe' => $isAssignedToMe,
            'isCompleted' => $isCompleted,
            'isAppealed' => $isAppealed,
        ];
    }

    /**
     * Asignar caso a mí mismo
     */
    public function assignToMe($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::findOrFail($id);
        
        if ($case->assigned_moderator_id && $case->assigned_moderator_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Este caso ya está asignado a otro moderador'
            ], 400);
        }

        $case->update([
            'assigned_moderator_id' => Auth::id(),
            'assigned_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Caso asignado correctamente'
        ]);
    }


    /**
     * Ocultar publicación con motivo
     */
    public function hidePublication(Request $request, $id)
    {
        $this->checkModeratorPermissions();
        
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);
        
        $case = ModerationCase::with('publication.user')->findOrFail($id);
        
        // Validaciones de estado del caso
        $buttonStates = $this->getButtonStates($case);
        
        // Validación estricta: No permitir si no está asignado a mí
        if (!$buttonStates['isAssignedToMe']) {
            return redirect()->back()->withErrors(['error' => 'Este caso no está asignado a ti. No puedes realizar esta acción.']);
        }
        
        // Validación estricta: No permitir si ya está completado
        if ($buttonStates['isCompleted']) {
            return redirect()->back()->withErrors(['error' => 'Este caso ya está completado (action_taken). No puedes realizar más acciones.']);
        }
        
        if (!$buttonStates['canHidePublication']) {
            return redirect()->back()->withErrors(['error' => 'No puedes ocultar esta publicación']);
        }

        DB::beginTransaction();

        try {
            // Ocultar la publicación
            $case->publication->update(['is_hidden' => true]);

            // Actualizar el caso
            $case->update([
                'status' => 'closed',
                'resolution_notes' => $request->reason,
                'resolved_at' => now(),
            ]);

            // Registrar la acción
            ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => Auth::id(),
                'action_type' => 'hide_publication',
                'action_description' => 'Publicación ocultada por moderación',
                'metadata' => [
                    'publication_id' => $case->publication->id,
                    'publication_title' => $case->publication->title,
                    'reason' => $request->reason,
                ]
            ]);

            // TODO: Enviar notificación al propietario de la publicación
            // $case->publication->user->notify(new PublicationHiddenNotification($case, $request->reason));

            DB::commit();

            return redirect()->back()->with('success', 'Publicación ocultada correctamente');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al ocultar publicación: ' . $e->getMessage());
            
            return redirect()->back()->withErrors(['error' => 'Error al ocultar la publicación']);
        }
    }

    /**
     * Restaurar publicación
     */
    public function restorePublication($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::with('publication')->findOrFail($id);
        
        // Validaciones de estado del caso
        $buttonStates = $this->getButtonStates($case);
        
        // Validación estricta: No permitir si no está asignado a mí
        if (!$buttonStates['isAssignedToMe']) {
            return redirect()->back()->withErrors(['error' => 'Este caso no está asignado a ti. No puedes realizar esta acción.']);
        }
        
        // Validación estricta: No permitir si ya está completado
        if ($buttonStates['isCompleted']) {
            return redirect()->back()->withErrors(['error' => 'Este caso ya está completado (action_taken). No puedes realizar más acciones.']);
        }
        
        if (!$buttonStates['canRestorePublication']) {
            return redirect()->back()->withErrors(['error' => 'No puedes restaurar esta publicación']);
        }

        DB::beginTransaction();

        try {
            // Restaurar la publicación
            $case->publication->update(['is_hidden' => false]);

            // Actualizar el caso
            $case->update([
                'status' => 'action_taken',
                'resolved_at' => now(),
            ]);

            // Registrar la acción
            ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => Auth::id(),
                'action_type' => 'restore_publication',
                'action_description' => 'Publicación restaurada',
                'metadata' => [
                    'publication_id' => $case->publication->id,
                    'publication_title' => $case->publication->title,
                ]
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Publicación restaurada correctamente');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al restaurar publicación: ' . $e->getMessage());
            
            return redirect()->back()->withErrors(['error' => 'Error al restaurar la publicación']);
        }
    }

    /**
     * Descartar caso
     */
    public function dismissCase(Request $request, $id)
    {
        $this->checkModeratorPermissions();
        
        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $case = ModerationCase::findOrFail($id);
        
        // Validaciones de estado del caso
        $buttonStates = $this->getButtonStates($case);
        
        // Validación estricta: No permitir si no está asignado a mí
        if (!$buttonStates['isAssignedToMe']) {
            return redirect()->back()->withErrors(['error' => 'Este caso no está asignado a ti. No puedes realizar esta acción.']);
        }
        
        // Validación estricta: No permitir si ya está completado
        if ($buttonStates['isCompleted']) {
            return redirect()->back()->withErrors(['error' => 'Este caso ya está completado (action_taken). No puedes realizar más acciones.']);
        }
        
        if (!$buttonStates['canDismissCase']) {
            return redirect()->back()->withErrors(['error' => 'No puedes descartar este caso']);
        }

        DB::beginTransaction();

        try {
            $case->update([
                'status' => 'closed',
                'resolution_notes' => $request->notes,
                'resolved_at' => now(),
            ]);

            // Registrar la acción
            ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => Auth::id(),
                'action_type' => 'dismiss_case',
                'action_description' => 'Caso descartado',
                'metadata' => [
                    'notes' => $request->notes,
                ]
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Caso descartado correctamente');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al descartar caso: ' . $e->getMessage());
            
            return redirect()->back()->withErrors(['error' => 'Error al descartar el caso']);
        }
    }

    /**
     * Revisar apelación
     */
    public function reviewAppeal(Request $request, $id)
    {
        $this->checkModeratorPermissions();
        
        $request->validate([
            'appeal_id' => 'required|exists:moderation_appeals,id',
            'review_notes' => 'required|string|max:1000',
            'final_decision' => 'required|in:uphold,overturn', // Nueva validación
        ]);

        try {
            $case = ModerationCase::findOrFail($id);
            $appeal = ModerationAppeal::findOrFail($request->appeal_id);

            // Validaciones de estado del caso
            $buttonStates = $this->getButtonStates($case);
            
            if (!$buttonStates['canReviewAppeal']) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes revisar esta apelación'
                ], 403);
            }

            // Verificar que la apelación pertenezca al caso
            if ($appeal->moderation_case_id !== $case->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'La apelación no pertenece a este caso'
                ], 400);
            }

            // Verificar que no esté ya revisada
            if ($appeal->reviewed_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta apelación ya ha sido revisada'
                ], 400);
            }

            DB::beginTransaction();

            // Actualizar la apelación
            $appeal->update([
                'review_notes' => $request->review_notes,
                'reviewing_moderator_id' => Auth::id(),
                'reviewed_at' => now(),
            ]);

            // Aplicar la decisión final
            if ($request->final_decision === 'overturn') {
                // Restaurar la publicación
                $case->publication->update(['is_hidden' => false]);
                $actionType = 'appeal_overturned';
                $actionDescription = 'Apelación aceptada - Publicación restaurada';
            } else {
                // Mantener la decisión original
                $actionType = 'appeal_rejected';
                $actionDescription = 'Apelación rechazada - Decisión original mantenida';
            }

            // Registrar la acción
            ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => Auth::id(),
                'action_type' => $actionType,
                'action_description' => $actionDescription,
                'metadata' => [
                    'appeal_id' => $appeal->id,
                    'appeal_reason' => $appeal->appeal_reason,
                    'review_notes' => $request->review_notes,
                    'final_decision' => $request->final_decision,
                ]
            ]);

            // Cerrar el caso definitivamente
            $case->update([
                'status' => 'closed',
                'resolved_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Apelación revisada correctamente',
                'decision' => $request->final_decision
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al revisar apelación: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la revisión de la apelación'
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de apelaciones
     */
    public function getAppealStats()
    {
        $this->checkModeratorPermissions();

        $stats = [
            'total_appeals' => ModerationAppeal::count(),
            'pending_appeals' => ModerationAppeal::whereNull('reviewed_at')->count(),
            'reviewed_appeals' => ModerationAppeal::whereNotNull('reviewed_at')->count(),
            'overturned_appeals' => ModerationAppeal::whereHas('moderationCase.actions', function($query) {
                $query->where('action_type', 'appeal_overturned');
            })->count(),
            'rejected_appeals' => ModerationAppeal::whereHas('moderationCase.actions', function($query) {
                $query->where('action_type', 'appeal_rejected');
            })->count(),
            'appeals_by_month' => ModerationAppeal::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
                ->where('created_at', '>=', now()->subMonths(6))
                ->groupBy('month')
                ->orderBy('month')
                ->get(),
        ];

        return response()->json($stats);
    }

    /**
     * Obtener apelaciones pendientes asignadas al moderador actual
     */
    public function getMyPendingAppeals()
    {
        $this->checkModeratorPermissions();

        $appeals = ModerationAppeal::with([
            'moderationCase.publication.category',
            'moderationCase.publication.user',
            'appealer'
        ])
        ->whereHas('moderationCase', function($query) {
            $query->where('assigned_moderator_id', Auth::id())
                  ->where('status', 'appealed');
        })
        ->whereNull('reviewed_at')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($appeals);
    }

    /**
     * Asignar caso de apelación a un moderador diferente
     */
    public function assignAppealCase($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::findOrFail($id);
        
        // Verificar que sea un caso de apelación
        if ($case->status !== 'appealed') {
            return response()->json([
                'success' => false,
                'message' => 'Este no es un caso de apelación'
            ], 400);
        }

        // Verificar que no esté ya asignado
        if ($case->assigned_moderator_id) {
            return response()->json([
                'success' => false,
                'message' => 'Este caso ya está asignado a otro moderador'
            ], 400);
        }

        // Asignar al moderador actual
        $case->update([
            'assigned_moderator_id' => Auth::id(),
            'assigned_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Caso de apelación asignado correctamente'
        ]);
    }

    /**
     * Obtener casos de reportes (no apelaciones) asignados al moderador
     */
    public function getMyReportCases()
    {
        $this->checkModeratorPermissions();
        
        $cases = ModerationCase::with(['publication.category', 'publication.user', 'reports.reporter'])
            ->where('assigned_moderator_id', Auth::id())
            ->where('status', '!=', 'appealed') // Excluir casos de apelación
            ->whereIn('status', ['pending', 'triage', 'in_review'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Obtener casos de apelaciones asignados al moderador
     */
    public function getMyAppealCases()
    {
        $this->checkModeratorPermissions();
        
        $cases = ModerationCase::with([
            'publication.category', 
            'publication.user', 
            'reports.reporter',
            'appeals.appealer',
            'appeals.reviewingModerator'
        ])
        ->where('assigned_moderator_id', Auth::id())
        ->where('status', 'appealed') // Solo casos de apelación
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($cases);
    }

    /**
     * Verificar si el moderador puede acceder a un caso específico
     */
    public function canAccessCase($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::findOrFail($id);
        
        // Si es un caso de apelación, verificar que no sea del moderador original
        if ($case->status === 'appealed') {
            // Buscar la acción original que ocultó la publicación
            $originalAction = ModerationAction::where('moderation_case_id', $case->id)
                ->where('action_type', 'hide_publication')
                ->first();
            
            if ($originalAction && $originalAction->moderator_id === Auth::id()) {
                return response()->json([
                    'can_access' => false,
                    'reason' => 'No puedes revisar una apelación de tu propia decisión'
                ]);
            }
        }
        
        // Verificar que esté asignado al moderador actual
        if ($case->assigned_moderator_id !== Auth::id()) {
            return response()->json([
                'can_access' => false,
                'reason' => 'Este caso no está asignado a ti'
            ]);
        }
        
        return response()->json([
            'can_access' => true
        ]);
    }

    /**
     * Reasignar casos de un moderador desactivado
     */
    public function reassignInactiveModeratorCases($moderatorId)
    {
        $this->checkModeratorPermissions();
        
        // Verificar que el usuario actual sea super_admin o admin
        if (!in_array(Auth::user()->role, ['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción'
            ], 403);
        }

        // Buscar casos asignados al moderador desactivado
        $cases = ModerationCase::where('assigned_moderator_id', $moderatorId)
            ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
            ->get();

        $reassignedCount = 0;

        foreach ($cases as $case) {
            // Desasignar el caso
            $case->update([
                'assigned_moderator_id' => null,
                'assigned_at' => null,
            ]);

            // Reasignar a otro moderador disponible
            $newModerator = $this->reassignCaseToAvailableModerator($case);
            
            if ($newModerator) {
                // Registrar la acción de reasignación
                ModerationAction::create([
                    'moderation_case_id' => $case->id,
                    'moderator_id' => Auth::id(),
                    'action_type' => 'reassign_from_inactive_moderator',
                    'action_description' => 'Caso reasignado por moderador inactivo',
                    'metadata' => [
                        'original_moderator_id' => $moderatorId,
                        'new_moderator_id' => $newModerator->id,
                        'new_moderator_name' => $newModerator->name . ' ' . $newModerator->surname,
                        'reassigned_by' => Auth::user()->name . ' ' . Auth::user()->surname,
                    ]
                ]);
            }
            
            $reassignedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Se reasignaron {$reassignedCount} casos correctamente"
        ]);
    }

    /**
     * Reasignar caso a moderador disponible
     */
    private function reassignCaseToAvailableModerator(ModerationCase $case)
    {
        // Buscar moderadores activos disponibles
        $moderator = User::whereIn('role', ['moderador', 'admin', 'super_admin'])
            ->where('status', StatusType::HABILITADO->value) // Solo activos
            ->where('is_active', true) // Solo activos
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->first();

        if ($moderator) {
            $case->update([
                'assigned_moderator_id' => $moderator->id,
                'assigned_at' => now(),
            ]);
            return $moderator;
        }
        
        return null;
    }

    /**
     * Obtener estadísticas de moderadores activos
     */
    public function getActiveModeratorsStats()
    {
        $this->checkModeratorPermissions();

        $stats = [
            'total_moderators' => User::whereIn('role', ['moderador', 'admin', 'super_admin'])->count(),
            'active_moderators' => User::whereIn('role', ['moderador', 'admin', 'super_admin'])
                ->where('status', StatusType::HABILITADO->value)
                ->where('is_active', true)
                ->count(),
            'inactive_moderators' => User::whereIn('role', ['moderador', 'admin', 'super_admin'])
                ->where(function($query) {
                    $query->where('status', StatusType::INHABILITADO->value)
                          ->orWhere('is_active', false);
                })
                ->count(),
            'moderators_with_cases' => User::whereIn('role', ['moderador', 'admin', 'super_admin'])
                ->where('status', StatusType::HABILITADO->value)
                ->where('is_active', true)
                ->whereHas('moderationCases', function($query) {
                    $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
                })
                ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Manejar reactivación de moderador
     */
    public function handleModeratorReactivation($moderatorId)
    {
        $this->checkModeratorPermissions();
        
        // Verificar que el usuario actual sea super_admin o admin
        if (!in_array(Auth::user()->role, ['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción'
            ], 403);
        }

        $moderator = User::findOrFail($moderatorId);
        
        // Verificar que sea un moderador
        if (!in_array($moderator->role, ['moderador', 'admin', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no es un moderador'
            ], 400);
        }

        // Verificar que esté siendo reactivado
        if ($moderator->status === StatusType::HABILITADO->value && $moderator->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'El moderador ya está activo'
            ], 400);
        }

        // Obtener estadísticas antes de la reactivación
        $stats = [
            'moderator_name' => $moderator->name . ' ' . $moderator->surname,
            'total_active_moderators' => User::whereIn('role', ['moderador', 'admin', 'super_admin'])
                ->where('status', StatusType::HABILITADO->value)
                ->where('is_active', true)
                ->count(),
            'cases_reassigned_while_inactive' => ModerationCase::whereHas('actions', function($query) use ($moderatorId) {
                $query->where('action_type', 'reassign_from_inactive_moderator')
                      ->where('metadata->original_moderator_id', $moderatorId);
            })->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Moderador reactivado. Los casos reasignados permanecen con sus nuevos moderadores.',
            'stats' => $stats,
            'recommendations' => [
                'Los casos reasignados NO vuelven automáticamente al moderador reactivado',
                'Esto evita interrumpir el trabajo de otros moderadores',
                'El moderador reactivado puede recibir nuevos casos normalmente',
                'Si necesitas reasignar casos específicos, usa la reasignación manual'
            ]
        ]);
    }

    /**
     * Reasignar casos específicos a un moderador (por SuperAdmin)
     */
    public function reassignSpecificCases(Request $request, $moderatorId)
    {
        $this->checkModeratorPermissions();
        
        // Verificar que el usuario actual sea super_admin
        if (Auth::user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo el SuperAdmin puede realizar reasignaciones manuales'
            ], 403);
        }

        $request->validate([
            'case_ids' => 'required|array',
            'case_ids.*' => 'exists:moderation_cases,id',
            'reason' => 'required|string|max:500',
        ]);

        $moderator = User::findOrFail($moderatorId);
        
        // Verificar que el moderador esté activo
        if ($moderator->status !== StatusType::HABILITADO->value || !$moderator->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'El moderador debe estar activo para recibir casos'
            ], 400);
        }

        $reassignedCount = 0;
        $errors = [];

        foreach ($request->case_ids as $caseId) {
            try {
                $case = ModerationCase::findOrFail($caseId);
                
                // Verificar que el caso esté en estado válido para reasignación
                if (!in_array($case->status, ['pending', 'triage', 'in_review', 'appealed'])) {
                    $errors[] = "Caso #{$caseId} no puede ser reasignado (estado: {$case->status})";
                    continue;
                }

                $originalModeratorId = $case->assigned_moderator_id;

                // Reasignar el caso
                $case->update([
                    'assigned_moderator_id' => $moderatorId,
                    'assigned_at' => now(),
                ]);

                // Registrar la acción de reasignación manual
                ModerationAction::create([
                    'moderation_case_id' => $case->id,
                    'moderator_id' => Auth::id(),
                    'action_type' => 'manual_reassign',
                    'action_description' => 'Caso reasignado manualmente por SuperAdmin',
                    'metadata' => [
                        'new_moderator_id' => $moderatorId,
                        'new_moderator_name' => $moderator->name . ' ' . $moderator->surname,
                        'original_moderator_id' => $originalModeratorId,
                        'reason' => $request->reason,
                        'reassigned_by' => Auth::user()->name . ' ' . Auth::user()->surname,
                    ]
                ]);

                $reassignedCount++;

            } catch (\Exception $e) {
                $errors[] = "Error al reasignar caso #{$caseId}: " . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Se reasignaron {$reassignedCount} casos correctamente",
            'reassigned_count' => $reassignedCount,
            'errors' => $errors,
        ]);
    }

    /**
     * Obtener casos que fueron reasignados de un moderador específico
     */
    public function getReassignedCasesFromModerator($moderatorId)
    {
        $this->checkModeratorPermissions();
        
        $cases = ModerationCase::with([
            'publication.category',
            'publication.user',
            'assignedModerator',
            'actions' => function($query) use ($moderatorId) {
                $query->where('action_type', 'reassign_from_inactive_moderator')
                      ->where('metadata->original_moderator_id', $moderatorId);
            }
        ])
        ->whereHas('actions', function($query) use ($moderatorId) {
            $query->where('action_type', 'reassign_from_inactive_moderator')
                  ->where('metadata->original_moderator_id', $moderatorId);
        })
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($cases);
    }

    /**
     * Obtener casos que requieren intervención manual
     */
    public function getCasesRequiringManualIntervention()
    {
        $this->checkModeratorPermissions();
        
        // Solo super_admin puede ver estos casos
        if (Auth::user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo el SuperAdmin puede ver casos que requieren intervención manual'
            ], 403);
        }

        $cases = ModerationCase::with([
            'publication.category',
            'publication.user',
            'appeals.appealer',
            'actions' => function($query) {
                $query->where('action_type', 'requires_manual_intervention');
            }
        ])
        ->whereHas('actions', function($query) {
            $query->where('action_type', 'requires_manual_intervention');
        })
        ->whereNull('assigned_moderator_id')
        ->where('status', 'appealed')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($cases);
    }

    /**
     * Asignar caso crítico a un moderador específico (SuperAdmin)
     */
    public function assignCriticalCase(Request $request, $caseId)
    {
        $this->checkModeratorPermissions();
        
        // Solo super_admin puede asignar casos críticos
        if (Auth::user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo el SuperAdmin puede asignar casos críticos'
            ], 403);
        }

        $request->validate([
            'moderator_id' => 'required|exists:users,id',
            'reason' => 'required|string|max:500',
        ]);

        $case = ModerationCase::findOrFail($caseId);
        $moderator = User::findOrFail($request->moderator_id);

        // Verificar que el moderador esté activo
        if ($moderator->status !== StatusType::HABILITADO->value || !$moderator->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'El moderador debe estar activo para recibir casos'
            ], 400);
        }

        // Verificar que sea un moderador válido
        if (!in_array($moderator->role, ['moderador', 'admin', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario debe ser un moderador'
            ], 400);
        }

        // Asignar el caso
        $case->update([
            'assigned_moderator_id' => $moderator->id,
            'assigned_at' => now(),
        ]);

        // Registrar la asignación manual
        ModerationAction::create([
            'moderation_case_id' => $case->id,
            'moderator_id' => Auth::id(),
            'action_type' => 'critical_case_assigned',
            'action_description' => 'Caso crítico asignado manualmente por SuperAdmin',
            'metadata' => [
                'assigned_to' => $moderator->name . ' ' . $moderator->surname,
                'assigned_by' => Auth::user()->name . ' ' . Auth::user()->surname,
                'reason' => $request->reason,
                'critical_case' => true,
            ]
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Caso crítico asignado correctamente',
            'assigned_to' => $moderator->name . ' ' . $moderator->surname
        ]);
    }

    /**
     * Obtener estadísticas de casos críticos
     */
    public function getCriticalCasesStats()
    {
        $this->checkModeratorPermissions();
        
        // Solo super_admin puede ver estas estadísticas
        if (Auth::user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo el SuperAdmin puede ver estadísticas de casos críticos'
            ], 403);
        }

        $stats = [
            'cases_requiring_intervention' => ModerationCase::whereHas('actions', function($query) {
                $query->where('action_type', 'requires_manual_intervention');
            })->whereNull('assigned_moderator_id')->count(),
            
            'escalated_to_admin' => ModerationCase::whereHas('actions', function($query) {
                $query->where('action_type', 'escalated_to_admin');
            })->count(),
            
            'single_moderator_scenarios' => ModerationCase::whereHas('actions', function($query) {
                $query->where('action_type', 'escalated_to_admin')
                      ->where('metadata->escalation_reason', 'single_moderator_scenario');
            })->count(),
            
            'active_moderators_count' => User::whereIn('role', ['moderador', 'admin', 'super_admin'])
                ->where('status', StatusType::HABILITADO->value)
                ->where('is_active', true)
                ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Asignar casos en espera cuando se crea un nuevo moderador
     */
    public function assignWaitingCasesToNewModerator($moderatorId)
    {
        $this->checkModeratorPermissions();
        
        // Verificar que el usuario actual sea super_admin o admin
        if (!in_array(Auth::user()->role, ['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción'
            ], 403);
        }

        $moderator = User::findOrFail($moderatorId);
        
        // Verificar que sea un moderador activo
        if ($moderator->role !== 'moderador' || 
            $moderator->status !== StatusType::HABILITADO->value || 
            !$moderator->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario debe ser un moderador activo'
            ], 400);
        }

        // Buscar casos en espera
        $waitingCases = ModerationCase::whereNull('assigned_moderator_id')
            ->where('status', 'appealed')
            ->whereHas('actions', function($query) {
                $query->where('action_type', 'waiting_for_moderator');
            })
            ->orderBy('created_at', 'asc') // Asignar los más antiguos primero
            ->get();

        $assignedCount = 0;

        foreach ($waitingCases as $case) {
            // Asignar el caso al nuevo moderador
            $case->update([
                'assigned_moderator_id' => $moderatorId,
                'assigned_at' => now(),
            ]);

            // Registrar la asignación
            ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => $moderatorId,
                'action_type' => 'assigned_from_waiting',
                'action_description' => 'Caso en espera asignado a nuevo moderador',
                'metadata' => [
                    'assigned_to' => $moderator->name . ' ' . $moderator->surname,
                    'was_waiting' => true,
                    'waiting_duration' => $case->created_at->diffInHours(now()) . ' horas',
                ]
            ]);

            $assignedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Se asignaron {$assignedCount} casos en espera al nuevo moderador",
            'assigned_count' => $assignedCount,
            'moderator_name' => $moderator->name . ' ' . $moderator->surname
        ]);
    }

    /**
     * Obtener casos en espera de moderadores
     */
    public function getWaitingCases()
    {
        $this->checkModeratorPermissions();
        
        $cases = ModerationCase::with([
            'publication.category',
            'publication.user',
            'appeals.appealer',
            'actions' => function($query) {
                $query->where('action_type', 'waiting_for_moderator');
            }
        ])
        ->whereNull('assigned_moderator_id')
        ->where('status', 'appealed')
        ->whereHas('actions', function($query) {
            $query->where('action_type', 'waiting_for_moderator');
        })
        ->orderBy('created_at', 'asc')
        ->get();

        return response()->json($cases);
    }

    /**
     * Obtener estadísticas de casos en espera
     */
    public function getWaitingCasesStats()
    {
        $this->checkModeratorPermissions();

        $stats = [
            'waiting_cases_count' => ModerationCase::whereNull('assigned_moderator_id')
                ->where('status', 'appealed')
                ->whereHas('actions', function($query) {
                    $query->where('action_type', 'waiting_for_moderator');
                })->count(),
            
            'active_moderators_count' => User::where('role', 'moderador')
                ->where('status', StatusType::HABILITADO->value)
                ->where('is_active', true)
                ->count(),
            
            'oldest_waiting_case' => ModerationCase::whereNull('assigned_moderator_id')
                ->where('status', 'appealed')
                ->whereHas('actions', function($query) {
                    $query->where('action_type', 'waiting_for_moderator');
                })
                ->orderBy('created_at', 'asc')
                ->first(),
        ];

        return response()->json($stats);
    }

    /**
     * Obtener estado de botones para un caso específico
     */
    public function getCaseButtonStates($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::with(['appeals', 'actions'])->findOrFail($id);
        $buttonStates = $this->getButtonStates($case);
        
        return response()->json($buttonStates);
    }

    /**
     * Verificar si el usuario puede realizar acciones en un caso
     */
    public function canPerformActions($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::findOrFail($id);
        $buttonStates = $this->getButtonStates($case);
        
        $response = [
            'can_perform_actions' => $buttonStates['isAssignedToMe'] && !$buttonStates['isCompleted'],
            'is_assigned_to_me' => $buttonStates['isAssignedToMe'],
            'is_completed' => $buttonStates['isCompleted'],
            'is_appealed' => $buttonStates['isAppealed'],
            'case_status' => $case->status,
            'assigned_to' => $case->assignedModerator ? $case->assignedModerator->name . ' ' . $case->assignedModerator->surname : 'Sin asignar',
            'current_user' => Auth::user()->name . ' ' . Auth::user()->surname,
            'message' => null
        ];

        // Generar mensaje explicativo
        if (!$buttonStates['isAssignedToMe']) {
            $response['message'] = "Este caso está asignado a: {$response['assigned_to']}. Solo el moderador asignado puede realizar acciones.";
        } elseif ($buttonStates['isCompleted']) {
            $response['message'] = "Este caso ya está completado (estado: {$case->status}). No se pueden realizar más acciones.";
        } elseif ($buttonStates['isAppealed']) {
            $response['message'] = "Este caso está apelado. Solo puedes revisar la apelación.";
        } else {
            $response['message'] = "Puedes realizar acciones en este caso.";
        }

        return response()->json($response);
    }
}