<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Enums\StatusType;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssignPendingAppeals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'moderation:assign-pending-appeals {--moderator-id= : ID específico del moderador a usar} {--dry-run : Solo mostrar qué se haría sin ejecutar cambios}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Asigna apelaciones pendientes a moderadores activos disponibles';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando asignación de apelaciones pendientes...');

        $moderatorId = $this->option('moderator-id');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('MODO DRY-RUN: No se realizarán cambios reales');
        }

        // Buscar apelaciones pendientes
        $pendingAppeals = ModerationCase::where('status', 'appealed')
            ->whereNull('assigned_moderator_id')
            ->whereHas('actions', function($query) {
                $query->where('action_type', 'close_case')
                      ->where('metadata->waiting_for_moderator', true);
            })
            ->get();

        if ($pendingAppeals->isEmpty()) {
            $this->info('No se encontraron apelaciones pendientes.');
            return 0;
        }

        $this->info("Encontradas {$pendingAppeals->count()} apelaciones pendientes.");

        $assignedCount = 0;

        foreach ($pendingAppeals as $case) {
            $this->line("Procesando apelación del caso: {$case->id}");

            // Buscar moderador disponible
            $moderator = $this->findAvailableModerator($case, $moderatorId);

            if (!$moderator) {
                $this->warn("  - No hay moderadores disponibles para este caso");
                continue;
            }

            // Verificar que no sea el mismo moderador que tomó la decisión original
            $originalModeratorId = $case->actions()
                ->where('action_type', 'hide_publication')
                ->first()?->moderator_id;

            if ($originalModeratorId && $originalModeratorId == $moderator->id) {
                $this->warn("  - Saltando: El moderador {$moderator->name} fue quien tomó la decisión original");
                continue;
            }

            if (!$dryRun) {
                try {
                    DB::beginTransaction();

                    // Asignar el caso al moderador
                    $case->update([
                        'assigned_moderator_id' => $moderator->id,
                        'assigned_at' => now(),
                    ]);

                    // Registrar la asignación
                    ModerationAction::create([
                        'moderation_case_id' => $case->id,
                        'moderator_id' => $moderator->id,
                        'action_type' => 'reassign_case',
                        'action_description' => 'Apelación asignada manualmente a moderador disponible',
                        'metadata' => [
                            'assigned_to' => $moderator->name . ' ' . $moderator->surname,
                            'assigned_by' => 'manual_command',
                            'reason' => 'manual_assignment',
                            'was_waiting' => true,
                            'original_moderator_id' => $originalModeratorId,
                        ]
                    ]);

                    DB::commit();
                    $assignedCount++;
                    $this->line("  - Asignado a: {$moderator->name} {$moderator->surname}");

                } catch (\Exception $e) {
                    DB::rollBack();
                    $this->error("  - Error al asignar: " . $e->getMessage());
                }
            } else {
                $this->line("  - [DRY-RUN] Se asignaría a: {$moderator->name} {$moderator->surname}");
                $assignedCount++;
            }
        }

        if ($dryRun) {
            $this->info("DRY-RUN completado. Se asignarían {$assignedCount} apelaciones en total.");
        } else {
            $this->info("Asignación completada. Se asignaron {$assignedCount} apelaciones en total.");
        }

        return 0;
    }

    /**
     * Encontrar moderador disponible para la apelación
     */
    private function findAvailableModerator(ModerationCase $case, $specificModeratorId = null)
    {
        if ($specificModeratorId) {
            $moderator = User::find($specificModeratorId);
            if ($moderator && $this->isModeratorEligible($moderator)) {
                return $moderator;
            }
            return null;
        }

        // Buscar moderadores activos (SOLO moderadores regulares)
        return User::where('role', 'moderador')
            ->where('status', StatusType::HABILITADO->value)
            ->where('is_active', true)
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->get()
            ->first(function($moderator) use ($case) {
                return $this->isModeratorEligible($moderator, $case);
            });
    }

    /**
     * Verificar si el moderador es elegible para la apelación
     */
    private function isModeratorEligible(User $moderator, ModerationCase $case = null): bool
    {
        if (!$this->isModeratorActive($moderator)) {
            return false;
        }

        if ($case) {
            // Verificar que no sea el mismo moderador que tomó la decisión original
            $originalModeratorId = $case->actions()
                ->where('action_type', 'hide_publication')
                ->first()?->moderator_id;

            if ($originalModeratorId && $originalModeratorId == $moderator->id) {
                return false;
            }
        }

        return true;
    }

    /**
     * Verificar si el moderador está activo
     */
    private function isModeratorActive(User $moderator): bool
    {
        return $moderator->status === StatusType::HABILITADO->value && 
               $moderator->is_active === true;
    }
}
