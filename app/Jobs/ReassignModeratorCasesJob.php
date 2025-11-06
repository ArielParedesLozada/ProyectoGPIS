<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Enums\StatusType;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReassignModeratorCasesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300; // 5 minutos
    public $tries = 3;

    protected $moderatorId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $moderatorId)
    {
        $this->moderatorId = $moderatorId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("Iniciando reasignación automática para moderador ID: {$this->moderatorId}");

            $moderator = User::find($this->moderatorId);
            
            if (!$moderator) {
                Log::warning("Moderador ID {$this->moderatorId} no encontrado");
                return;
            }

            // Verificar que el moderador esté realmente inactivo
            if ($this->isModeratorActive($moderator)) {
                Log::info("Moderador ID {$this->moderatorId} está activo. Cancelando reasignación.");
                return;
            }

            // Obtener casos asignados al moderador
            $cases = ModerationCase::where('assigned_moderator_id', $this->moderatorId)
                ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
                ->get();

            if ($cases->isEmpty()) {
                Log::info("Moderador ID {$this->moderatorId} no tiene casos asignados");
                return;
            }

            Log::info("Encontrados {$cases->count()} casos para reasignar del moderador ID {$this->moderatorId}");

            $reassignedCount = 0;
            $escalatedCount = 0;

            foreach ($cases as $case) {
                try {
                    DB::beginTransaction();

                    // Desasignar el caso
                    $case->update([
                        'assigned_moderator_id' => null,
                        'assigned_at' => null,
                    ]);

                    // Buscar moderador activo disponible
                    $newModerator = $this->findAvailableModerator();

                    if ($newModerator) {
                        // Reasignar a nuevo moderador
                        $case->update([
                            'assigned_moderator_id' => $newModerator->id,
                            'assigned_at' => now(),
                        ]);

                        // Registrar la acción
                        ModerationAction::create([
                            'moderation_case_id' => $case->id,
                            'moderator_id' => $newModerator->id,
                            'action_type' => 'reassign_case',
                            'action_description' => 'Caso reasignado automáticamente por moderador inactivo',
                            'metadata' => [
                                'original_moderator_id' => $this->moderatorId,
                                'original_moderator_name' => $moderator->name . ' ' . $moderator->surname,
                                'new_moderator_id' => $newModerator->id,
                                'new_moderator_name' => $newModerator->name . ' ' . $newModerator->surname,
                                'reassigned_by' => 'system_automation',
                                'reassigned_at' => now()->toISOString(),
                                'reason' => 'moderator_inactive'
                            ]
                        ]);

                        $reassignedCount++;
                        Log::info("Caso {$case->id} reasignado de moderador {$this->moderatorId} a {$newModerator->id}");

                    } else {
                        // Si no hay moderadores ni admins disponibles, dejar el caso sin asignar
                        // Se asignará automáticamente cuando haya un moderador/admin disponible
                        $escalatedCount++;
                        Log::info("Caso {$case->id} quedó sin asignar - No hay moderadores ni admins activos disponibles. Se asignará automáticamente cuando haya uno disponible.");
                    }

                    DB::commit();

                } catch (\Exception $e) {
                    DB::rollBack();
                    Log::error("Error al reasignar caso {$case->id}: " . $e->getMessage());
                    throw $e; // Re-lanzar para que el job falle y se reintente
                }
            }

            Log::info("Reasignación completada para moderador ID {$this->moderatorId}: {$reassignedCount} reasignados, {$escalatedCount} escalados");

        } catch (\Exception $e) {
            Log::error("Error en ReassignModeratorCasesJob para moderador {$this->moderatorId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Verificar si el moderador está activo
     */
    private function isModeratorActive(User $moderator): bool
    {
        return $moderator->status === StatusType::HABILITADO->value && 
               $moderator->is_active === true;
    }

    /**
     * Encontrar moderador activo disponible (moderadores y admins, NO super_admin)
     */
    private function findAvailableModerator(): ?User
    {
        return User::whereIn('role', ['moderador', 'admin']) // Solo moderadores y admins
            ->where('status', StatusType::HABILITADO->value)
            ->where('is_active', true)
            ->where('id', '!=', $this->moderatorId) // Excluir el moderador desactivado
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->first();
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ReassignModeratorCasesJob falló para moderador {$this->moderatorId}: " . $exception->getMessage());
    }
}
