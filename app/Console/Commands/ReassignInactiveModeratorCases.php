<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Enums\StatusType;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReassignInactiveModeratorCases extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'moderation:reassign-inactive-cases {--moderator-id= : ID específico del moderador a procesar} {--dry-run : Solo mostrar qué se haría sin ejecutar cambios}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reasigna casos de moderadores inactivos a moderadores activos disponibles';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando reasignación de casos de moderadores inactivos...');

        $moderatorId = $this->option('moderator-id');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('MODO DRY-RUN: No se realizarán cambios reales');
        }

        // Obtener moderadores inactivos
        $inactiveModerators = $this->getInactiveModerators($moderatorId);

        if ($inactiveModerators->isEmpty()) {
            $this->info('No se encontraron moderadores inactivos con casos asignados.');
            return 0;
        }

        $totalReassigned = 0;

        foreach ($inactiveModerators as $moderator) {
            $this->info("Procesando moderador: {$moderator->name} {$moderator->surname} (ID: {$moderator->id})");
            
            $cases = $this->getModeratorCases($moderator->id);
            
            if ($cases->isEmpty()) {
                $this->line("  - No tiene casos asignados");
                continue;
            }

            $this->line("  - Casos encontrados: {$cases->count()}");

            if (!$dryRun) {
                $reassignedCount = $this->reassignModeratorCases($moderator, $cases);
                $totalReassigned += $reassignedCount;
                $this->line("  - Casos reasignados: {$reassignedCount}");
            } else {
                $this->line("  - [DRY-RUN] Se reasignarían {$cases->count()} casos");
                $totalReassigned += $cases->count();
            }
        }

        if ($dryRun) {
            $this->info("DRY-RUN completado. Se reasignarían {$totalReassigned} casos en total.");
        } else {
            $this->info("Reasignación completada. Se reasignaron {$totalReassigned} casos en total.");
        }

        return 0;
    }

    /**
     * Obtener moderadores inactivos con casos asignados
     */
    private function getInactiveModerators($specificModeratorId = null)
    {
        $query = User::whereIn('role', ['moderador', 'admin', 'super_admin'])
            ->where(function($q) {
                $q->where('status', StatusType::INHABILITADO->value)
                  ->orWhere('is_active', false);
            })
            ->whereHas('moderationCases', function($q) {
                $q->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            });

        if ($specificModeratorId) {
            $query->where('id', $specificModeratorId);
        }

        return $query->get();
    }

    /**
     * Obtener casos de un moderador específico
     */
    private function getModeratorCases($moderatorId)
    {
        return ModerationCase::where('assigned_moderator_id', $moderatorId)
            ->whereIn('status', ['pending', 'triage', 'in_review', 'appealed'])
            ->get();
    }

    /**
     * Reasignar casos de un moderador
     */
    private function reassignModeratorCases(User $inactiveModerator, $cases)
    {
        $reassignedCount = 0;

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
                                'original_moderator_id' => $inactiveModerator->id,
                                'original_moderator_name' => $inactiveModerator->name . ' ' . $inactiveModerator->surname,
                                'new_moderator_id' => $newModerator->id,
                                'new_moderator_name' => $newModerator->name . ' ' . $newModerator->surname,
                                'reassigned_by' => 'system_automation',
                                'reassigned_at' => now()->toISOString(),
                                'reason' => 'moderator_inactive'
                            ]
                        ]);

                    $reassignedCount++;
                } else {
                    // Si no hay moderadores disponibles, dejar sin asignar - se asignará automáticamente cuando haya uno disponible
                    Log::info("Caso {$case->id} quedó sin asignar - No hay moderadores activos disponibles. Se asignará automáticamente cuando haya uno disponible.");
                }

                DB::commit();

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Error al reasignar caso {$case->id}: " . $e->getMessage());
                $this->error("Error al reasignar caso {$case->id}: " . $e->getMessage());
            }
        }

        return $reassignedCount;
    }

    /**
     * Encontrar moderador activo disponible (moderadores y admins, NO super_admin)
     */
    private function findAvailableModerator()
    {
        return User::whereIn('role', ['moderador', 'admin']) // Solo moderadores y admins
            ->where('status', StatusType::HABILITADO->value)
            ->where('is_active', true)
            ->withCount(['moderationCases' => function($query) {
                $query->whereIn('status', ['pending', 'triage', 'in_review', 'appealed']);
            }])
            ->orderBy('moderation_cases_count')
            ->first();
    }
}
