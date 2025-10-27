<?php

namespace App\Observers;

use App\Models\User;
use App\Enums\StatusType;
use App\Jobs\ReassignModeratorCasesJob;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user)
    {
        // Verificar si el usuario es un moderador y si cambió su estado a inactivo
        if ($this->isModerator($user) && $this->wasDeactivated($user)) {
            $this->handleModeratorDeactivation($user);
        }
        
        // Verificar si el usuario es un moderador y si cambió su estado a activo
        if ($this->isModerator($user) && $this->wasActivated($user)) {
            $this->handleModeratorActivation($user);
        }
    }

    /**
     * Handle the User "created" event.
     */
    public function created(User $user)
    {
        // Si se crea un nuevo moderador, asignar apelaciones pendientes
        if ($this->isModerator($user) && $this->isModeratorActive($user)) {
            $this->handleModeratorActivation($user);
        }
    }

    /**
     * Verificar si el usuario es un moderador
     */
    private function isModerator(User $user): bool
    {
        return in_array($user->role, ['moderador', 'admin', 'super_admin']);
    }

    /**
     * Verificar si el moderador fue desactivado
     */
    private function wasDeactivated(User $user): bool
    {
        // Verificar si cambió el status a INHABILITADO
        $statusChanged = $user->wasChanged('status') && 
                        $user->status === StatusType::INHABILITADO->value;

        // Verificar si cambió is_active a false
        $activeChanged = $user->wasChanged('is_active') && 
                        $user->is_active === false;

        return $statusChanged || $activeChanged;
    }

    /**
     * Verificar si el moderador fue activado
     */
    private function wasActivated(User $user): bool
    {
        // Verificar si cambió el status a HABILITADO
        $statusChanged = $user->wasChanged('status') && 
                        $user->status === StatusType::HABILITADO->value;

        // Verificar si cambió is_active a true
        $activeChanged = $user->wasChanged('is_active') && 
                        $user->is_active === true;

        return $statusChanged || $activeChanged;
    }

    /**
     * Verificar si el moderador está activo
     */
    private function isModeratorActive(User $user): bool
    {
        return $user->status === StatusType::HABILITADO->value && 
               $user->is_active === true;
    }

    /**
     * Manejar la desactivación de un moderador
     */
    private function handleModeratorDeactivation(User $user): void
    {
        try {
            Log::info("Moderador desactivado detectado: {$user->name} {$user->surname} (ID: {$user->id})");

            // Verificar si tiene casos asignados
            $hasAssignedCases = $user->moderationCases()
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->exists();

            if ($hasAssignedCases) {
                Log::info("Moderador desactivado tiene casos asignados. Iniciando reasignación automática...");
                
                // Ejecutar reasignación inmediatamente (síncrona)
                $this->executeReassignment($user);
                
                Log::info("Reasignación completada para moderador ID: {$user->id}");
            } else {
                Log::info("Moderador desactivado no tiene casos asignados. No se requiere reasignación.");
            }

        } catch (\Exception $e) {
            Log::error("Error al manejar desactivación de moderador {$user->id}: " . $e->getMessage());
        }
    }

    /**
     * Ejecutar reasignación inmediatamente
     */
    private function executeReassignment(User $user): void
    {
        $cases = \App\Models\ModerationCase::where('assigned_moderator_id', $user->id)
            ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
            ->get();

        if ($cases->isEmpty()) {
            return;
        }

        // Buscar moderador activo disponible (moderadores y admins, NO super_admin)
        $newModerator = \App\Models\User::whereIn('role', ['moderador', 'admin']) // Solo moderadores y admins
            ->where('status', \App\Enums\StatusType::HABILITADO->value)
            ->where('is_active', true)
            ->where('id', '!=', $user->id) // Excluir el moderador desactivado
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->first();

        foreach ($cases as $case) {
            try {
                \Illuminate\Support\Facades\DB::beginTransaction();

                // Desasignar el caso
                $case->update([
                    'assigned_moderator_id' => null,
                    'assigned_at' => null,
                ]);

                if ($newModerator) {
                    // Reasignar a nuevo moderador
                    $case->update([
                        'assigned_moderator_id' => $newModerator->id,
                        'assigned_at' => now(),
                    ]);

                    // Registrar la acción
                    \App\Models\ModerationAction::create([
                        'moderation_case_id' => $case->id,
                        'moderator_id' => $newModerator->id,
                        'action_type' => 'reassign_case',
                        'action_description' => 'Caso reasignado automáticamente por moderador inactivo',
                        'metadata' => [
                            'original_moderator_id' => $user->id,
                            'original_moderator_name' => $user->name . ' ' . $user->surname,
                            'new_moderator_id' => $newModerator->id,
                            'new_moderator_name' => $newModerator->name . ' ' . $newModerator->surname,
                            'reassigned_by' => 'system_automation',
                            'reassigned_at' => now()->toISOString(),
                            'reason' => 'moderator_inactive'
                        ]
                    ]);

                    Log::info("Caso {$case->id} reasignado de moderador {$user->id} a {$newModerator->id}");
                } else {
                    // Si no hay moderadores disponibles, marcar para intervención manual
                    \App\Models\ModerationAction::create([
                        'moderation_case_id' => $case->id,
                        'moderator_id' => 1, // Usar el primer admin disponible
                        'action_type' => 'close_case',
                        'action_description' => 'Caso requiere intervención manual - No hay moderadores activos disponibles',
                        'metadata' => [
                            'original_moderator_id' => $user->id,
                            'original_moderator_name' => $user->name . ' ' . $user->surname,
                            'reason' => 'no_active_moderators_available',
                            'escalated_at' => now()->toISOString(),
                            'requires_manual_intervention' => true
                        ]
                    ]);

                    Log::warning("Caso {$case->id} escalado para intervención manual - No hay moderadores activos");
                }

                \Illuminate\Support\Facades\DB::commit();

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                Log::error("Error al reasignar caso {$case->id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Manejar la activación de un moderador
     */
    private function handleModeratorActivation(User $user): void
    {
        try {
            Log::info("Moderador activado detectado: {$user->name} {$user->surname} (ID: {$user->id})");

            // Buscar apelaciones pendientes que esperan moderador
            $pendingAppeals = \App\Models\ModerationCase::where('status', 'appealed')
                ->whereNull('assigned_moderator_id')
                ->whereHas('actions', function($query) {
                    $query->where('action_type', 'close_case')
                          ->where('metadata->waiting_for_moderator', true);
                })
                ->get();

            if ($pendingAppeals->isEmpty()) {
                Log::info("No hay apelaciones pendientes para asignar al moderador ID: {$user->id}");
                return;
            }

            Log::info("Encontradas {$pendingAppeals->count()} apelaciones pendientes para asignar al moderador ID: {$user->id}");

            $assignedCount = 0;

            foreach ($pendingAppeals as $case) {
                try {
                    \Illuminate\Support\Facades\DB::beginTransaction();

                    // Verificar que no sea el mismo moderador que tomó la decisión original
                    $originalModeratorId = $case->actions()
                        ->where('action_type', 'hide_publication')
                        ->first()?->moderator_id;

                    if ($originalModeratorId && $originalModeratorId == $user->id) {
                        Log::info("Saltando caso {$case->id} - El moderador {$user->id} fue quien tomó la decisión original");
                        \Illuminate\Support\Facades\DB::rollBack();
                        continue;
                    }

                    // Asignar el caso al moderador activado
                    $case->update([
                        'assigned_moderator_id' => $user->id,
                        'assigned_at' => now(),
                    ]);

                    // Registrar la asignación
                    \App\Models\ModerationAction::create([
                        'moderation_case_id' => $case->id,
                        'moderator_id' => $user->id,
                        'action_type' => 'reassign_case',
                        'action_description' => 'Apelación asignada automáticamente a moderador recién activado',
                        'metadata' => [
                            'assigned_to' => $user->name . ' ' . $user->surname,
                            'assigned_by' => 'system_automation',
                            'reason' => 'moderator_activated',
                            'was_waiting' => true,
                            'original_moderator_id' => $originalModeratorId,
                        ]
                    ]);

                    $assignedCount++;
                    Log::info("Apelación {$case->id} asignada al moderador {$user->id}");

                    \Illuminate\Support\Facades\DB::commit();

                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\DB::rollBack();
                    Log::error("Error al asignar apelación {$case->id} al moderador {$user->id}: " . $e->getMessage());
                }
            }

            Log::info("Se asignaron {$assignedCount} apelaciones al moderador ID: {$user->id}");

        } catch (\Exception $e) {
            Log::error("Error al manejar activación de moderador {$user->id}: " . $e->getMessage());
        }
    }
}
