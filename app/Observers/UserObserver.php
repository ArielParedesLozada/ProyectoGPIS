<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Publication;
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

        // Verificar si el usuario es un vendedor y si cambió su estado a inactivo
        if ($this->isVendor($user) && $this->wasDeactivated($user)) {
            $this->handleVendorDeactivation($user);
        }
        
        // Verificar si el usuario es un vendedor y si cambió su estado a activo
        if ($this->isVendor($user) && $this->wasActivated($user)) {
            $this->handleVendorActivation($user);
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

            // Asignar TODOS los casos pendientes (reportes y apelaciones)
            $this->assignPendingCasesToModerator($user);

        } catch (\Exception $e) {
            Log::error("Error al manejar activación de moderador {$user->id}: " . $e->getMessage());
        }
    }

    /**
     * Asignar casos pendientes a un moderador
     */
    private function assignPendingCasesToModerator(User $user): void
    {
        // Buscar TODOS los casos sin asignar (reportes normales)
        $pendingCases = \App\Models\ModerationCase::whereNull('assigned_moderator_id')
            ->whereIn('status', ['pending', 'triage', 'in_review'])
            ->get();

        // Buscar apelaciones pendientes
        $pendingAppeals = \App\Models\ModerationCase::where('status', 'appealed')
            ->whereNull('assigned_moderator_id')
            ->get();

        $totalPending = $pendingCases->count() + $pendingAppeals->count();

        if ($totalPending === 0) {
            Log::info("No hay casos pendientes para asignar al moderador ID: {$user->id}");
            return;
        }

        Log::info("Encontrados {$totalPending} casos pendientes para asignar al moderador ID: {$user->id}");

        $assignedCount = 0;

        // Asignar casos normales
        foreach ($pendingCases as $case) {
            try {
                \Illuminate\Support\Facades\DB::beginTransaction();

                // Asignar el caso al moderador
                $case->update([
                    'assigned_moderator_id' => $user->id,
                    'assigned_at' => now(),
                ]);

                // Registrar la asignación
                \App\Models\ModerationAction::create([
                    'moderation_case_id' => $case->id,
                    'moderator_id' => $user->id,
                    'action_type' => 'assign_case',
                    'action_description' => 'Caso asignado automáticamente a nuevo moderador',
                    'metadata' => [
                        'assigned_to' => $user->name . ' ' . $user->surname,
                        'assigned_by' => 'system_automation',
                        'reason' => 'new_moderator_activation',
                    ]
                ]);

                $assignedCount++;
                Log::info("Caso {$case->id} asignado al moderador {$user->id}");

                \Illuminate\Support\Facades\DB::commit();

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                Log::error("Error al asignar caso {$case->id} al moderador {$user->id}: " . $e->getMessage());
            }
        }

        // Asignar apelaciones (misma lógica que antes)
        foreach ($pendingAppeals as $case) {
            try {
                \Illuminate\Support\Facades\DB::beginTransaction();

                // Verificar que no sea el mismo moderador que tomó la decisión original
                $originalModeratorId = $case->actions()
                    ->where('action_type', 'hide_publication')
                    ->first()?->moderator_id;

                if ($originalModeratorId && $originalModeratorId == $user->id) {
                    Log::info("Saltando apelación {$case->id} - El moderador {$user->id} fue quien tomó la decisión original");
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

        Log::info("Se asignaron {$assignedCount} casos al moderador ID: {$user->id}");
    }

    /**
     * Verificar si el usuario es un vendedor
     */
    private function isVendor(User $user): bool
    {
        return $user->role === 'vendedor';
    }

    /**
     * Manejar la desactivación de un vendedor
     */
    private function handleVendorDeactivation(User $user): void
    {
        try {
            Log::info("Vendedor desactivado detectado: {$user->name} {$user->surname} (ID: {$user->id})");

            // Obtener todas las publicaciones disponibles del vendedor
            $availablePublications = $user->publications()
                ->where('status', StatusType::HABILITADO->value)
                ->where('is_hidden', false)
                ->where('hidden_by_vendor_deactivation', false)
                ->get();

            if ($availablePublications->isEmpty()) {
                Log::info("Vendedor desactivado no tiene publicaciones disponibles para ocultar. ID: {$user->id}");
                return;
            }

            Log::info("Ocultando {$availablePublications->count()} publicaciones del vendedor desactivado ID: {$user->id}");

            // Ocultar las publicaciones disponibles
            foreach ($availablePublications as $publication) {
                $publication->update([
                    'is_hidden' => true,
                    'hidden_by_vendor_deactivation' => true
                ]);

                Log::info("Publicación {$publication->id} ocultada por desactivación del vendedor {$user->id}");
            }

            Log::info("Se ocultaron {$availablePublications->count()} publicaciones del vendedor ID: {$user->id}");

        } catch (\Exception $e) {
            Log::error("Error al manejar desactivación de vendedor {$user->id}: " . $e->getMessage());
        }
    }

    /**
     * Manejar la activación de un vendedor
     */
    private function handleVendorActivation(User $user): void
    {
        try {
            Log::info("Vendedor activado detectado: {$user->name} {$user->surname} (ID: {$user->id})");

            // Obtener todas las publicaciones que fueron ocultadas por desactivación del vendedor
            $hiddenByDeactivationPublications = $user->publications()
                ->where('hidden_by_vendor_deactivation', true)
                ->get();

            if ($hiddenByDeactivationPublications->isEmpty()) {
                Log::info("Vendedor activado no tiene publicaciones ocultas por desactivación. ID: {$user->id}");
                return;
            }

            Log::info("Restaurando {$hiddenByDeactivationPublications->count()} publicaciones del vendedor activado ID: {$user->id}");

            // Restaurar las publicaciones que fueron ocultadas por desactivación
            foreach ($hiddenByDeactivationPublications as $publication) {
                $publication->update([
                    'is_hidden' => false,
                    'hidden_by_vendor_deactivation' => false
                ]);

                Log::info("Publicación {$publication->id} restaurada por activación del vendedor {$user->id}");
            }

            Log::info("Se restauraron {$hiddenByDeactivationPublications->count()} publicaciones del vendedor ID: {$user->id}");

        } catch (\Exception $e) {
            Log::error("Error al manejar activación de vendedor {$user->id}: " . $e->getMessage());
        }
    }
}
