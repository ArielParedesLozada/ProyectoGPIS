<?php

namespace App\Http\Controllers;

use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\Publication;
use App\Models\User;
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
            'my_cases' => ModerationCase::where('assigned_moderator_id', Auth::id())
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->count(),
            'unassigned_cases' => ModerationCase::whereNull('assigned_moderator_id')
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->count(),
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

        return Inertia::render('moderation/show', [
            'case' => $case,
        ]);
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
     * Cambiar estado del caso
     */
    public function updateStatus(Request $request, $id)
    {
        $this->checkModeratorPermissions();
        
        $request->validate([
            'status' => 'required|in:pending,triage,in_review,action_taken,dismissed,closed',
            'notes' => 'nullable|string|max:1000',
        ]);

        $case = ModerationCase::findOrFail($id);
        
        // Verificar que el moderador tenga permisos para modificar este caso
        if ($case->assigned_moderator_id && $case->assigned_moderator_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar este caso'
            ], 403);
        }

        DB::beginTransaction();

        try {
            $oldStatus = $case->status;
            $case->update([
                'status' => $request->status,
                'resolution_notes' => $request->notes,
                'resolved_at' => in_array($request->status, ['action_taken', 'dismissed', 'closed']) ? now() : null,
            ]);

            // Registrar la acción
            ModerationAction::create([
                'moderation_case_id' => $case->id,
                'moderator_id' => Auth::id(),
                'action_type' => 'status_change',
                'action_description' => "Estado cambiado de '{$oldStatus}' a '{$request->status}'",
                'metadata' => [
                    'old_status' => $oldStatus,
                    'new_status' => $request->status,
                    'notes' => $request->notes,
                ]
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Estado actualizado correctamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar estado del caso: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el estado'
            ], 500);
        }
    }

    /**
     * Ocultar publicación
     */
    public function hidePublication($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::with('publication')->findOrFail($id);
        
        if ($case->assigned_moderator_id && $case->assigned_moderator_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar este caso'
            ], 403);
        }

        DB::beginTransaction();

        try {
            // Ocultar la publicación
            $case->publication->update(['is_hidden' => true]);

            // Actualizar el caso
            $case->update([
                'status' => 'action_taken',
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
                ]
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Publicación ocultada correctamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al ocultar publicación: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al ocultar la publicación'
            ], 500);
        }
    }

    /**
     * Restaurar publicación
     */
    public function restorePublication($id)
    {
        $this->checkModeratorPermissions();
        
        $case = ModerationCase::with('publication')->findOrFail($id);
        
        if ($case->assigned_moderator_id && $case->assigned_moderator_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar este caso'
            ], 403);
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

            return response()->json([
                'success' => true,
                'message' => 'Publicación restaurada correctamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al restaurar publicación: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al restaurar la publicación'
            ], 500);
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
        
        if ($case->assigned_moderator_id && $case->assigned_moderator_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar este caso'
            ], 403);
        }

        DB::beginTransaction();

        try {
            $case->update([
                'status' => 'dismissed',
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

            return response()->json([
                'success' => true,
                'message' => 'Caso descartado correctamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al descartar caso: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al descartar el caso'
            ], 500);
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
            'status' => 'required|in:accepted,rejected',
            'review_notes' => 'required|string|max:1000',
        ]);

        try {
            $case = ModerationCase::findOrFail($id);
            $appeal = ModerationAppeal::findOrFail($request->appeal_id);

            // Verificar que la apelación pertenezca al caso
            if ($appeal->moderation_case_id !== $case->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'La apelación no pertenece a este caso'
                ], 400);
            }

            // Verificar que la apelación esté pendiente
            if ($appeal->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta apelación ya ha sido revisada'
                ], 400);
            }

            DB::beginTransaction();

            // Actualizar la apelación
            $appeal->update([
                'status' => $request->status,
                'review_notes' => $request->review_notes,
                'reviewing_moderator_id' => Auth::id(),
                'reviewed_at' => now(),
            ]);

            // Si la apelación es aceptada, restaurar la publicación
            if ($request->status === 'accepted') {
                $case->publication->update(['is_hidden' => false]);
                
                // Registrar la acción
                ModerationAction::create([
                    'moderation_case_id' => $case->id,
                    'moderator_id' => Auth::id(),
                    'action_type' => 'restore_publication',
                    'action_description' => 'Publicación restaurada por apelación aceptada',
                    'metadata' => [
                        'appeal_id' => $appeal->id,
                        'appeal_reason' => $appeal->appeal_reason,
                        'review_notes' => $request->review_notes,
                    ]
                ]);
            } else {
                // Si es rechazada, mantener la acción
                ModerationAction::create([
                    'moderation_case_id' => $case->id,
                    'moderator_id' => Auth::id(),
                    'action_type' => 'dismiss_case',
                    'action_description' => 'Apelación rechazada',
                    'metadata' => [
                        'appeal_id' => $appeal->id,
                        'appeal_reason' => $appeal->appeal_reason,
                        'review_notes' => $request->review_notes,
                    ]
                ]);
            }

            // Cerrar el caso
            $case->update([
                'status' => 'closed',
                'resolved_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $request->status === 'accepted' 
                    ? 'Apelación aceptada y publicación restaurada' 
                    : 'Apelación rechazada'
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
}