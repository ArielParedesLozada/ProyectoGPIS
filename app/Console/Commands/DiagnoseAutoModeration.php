<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Publication;
use App\Models\ModerationCase;
use App\Models\ModerationAction;

class DiagnoseAutoModeration extends Command
{
    protected $signature = 'moderation:diagnose-auto';
    protected $description = 'Diagnosticar casos de auto-moderación';

    public function handle()
    {
        $this->info('=== DIAGNÓSTICO DE AUTO-MODERACIÓN ===');
        $this->newLine();

        // Buscar publicaciones ocultas con casos de auto-moderación
        $hiddenPublications = Publication::where('is_hidden', true)
            ->with(['moderationCases' => function($query) {
                $query->where('source', 'auto_moderation')
                      ->with(['actions' => function($actionQuery) {
                          $actionQuery->where('action_type', 'hide_publication')
                                     ->orderBy('created_at', 'desc')
                                     ->limit(1);
                      }]);
            }])
            ->get();

        $this->info("Publicaciones ocultas con auto-moderación: " . $hiddenPublications->count());
        $this->newLine();

        foreach ($hiddenPublications as $publication) {
            $this->info("Publicación ID: {$publication->id}");
            $this->info("  - Título: {$publication->title}");
            $this->info("  - Oculto: " . ($publication->is_hidden ? 'Sí' : 'No'));
            
            if ($publication->moderationCases->isNotEmpty()) {
                $case = $publication->moderationCases->first();
                $this->info("  - Caso ID: {$case->id}");
                $this->info("  - Estado: {$case->status}");
                $this->info("  - Fuente: {$case->source}");
                $this->info("  - Moderador asignado: " . ($case->assigned_moderator_id ?? 'Ninguno'));
                
                if ($case->actions->isNotEmpty()) {
                    $action = $case->actions->first();
                    $this->info("  - Acción: {$action->action_type}");
                    $this->info("  - Descripción: {$action->action_description}");
                    $this->info("  - Metadata: " . json_encode($action->metadata));
                }
                
                // Verificar si puede apelar
                $canAppeal = !in_array($case->status, ['closed', 'action_taken']);
                $this->info("  - Puede apelar: " . ($canAppeal ? 'Sí' : 'No'));
            } else {
                $this->error("  - ❌ No tiene casos de moderación");
            }
            
            $this->newLine();
        }

        $this->info('=== FIN DEL DIAGNÓSTICO ===');
    }
}
