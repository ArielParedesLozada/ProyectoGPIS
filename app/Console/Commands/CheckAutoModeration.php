<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Publication;
use App\Models\ModerationCase;
use App\Models\ModerationAction;

class CheckAutoModeration extends Command
{
    protected $signature = 'moderation:check-auto {publication_id?}';
    protected $description = 'Verificar casos de auto-moderación';

    public function handle()
    {
        $publicationId = $this->argument('publication_id');
        
        if ($publicationId) {
            $this->checkSpecificPublication($publicationId);
        } else {
            $this->checkAllAutoModeration();
        }
    }

    private function checkSpecificPublication($publicationId)
    {
        $this->info("=== VERIFICANDO PUBLICACIÓN ID: {$publicationId} ===");
        
        $publication = Publication::find($publicationId);
        
        if (!$publication) {
            $this->error("Publicación no encontrada");
            return;
        }

        $this->info("Publicación: {$publication->title}");
        $this->info("Oculto: " . ($publication->is_hidden ? 'Sí' : 'No'));
        $this->info("Propietario: {$publication->created_by}");

        // Buscar casos de moderación
        $cases = ModerationCase::where('publication_id', $publicationId)->get();
        
        $this->info("Casos de moderación: " . $cases->count());
        
        foreach ($cases as $case) {
            $this->info("  - Caso ID: {$case->id}");
            $this->info("  - Estado: {$case->status}");
            $this->info("  - Fuente: {$case->source}");
            $this->info("  - Moderador asignado: " . ($case->assigned_moderator_id ?? 'Ninguno'));
            
            // Buscar acciones
            $actions = ModerationAction::where('moderation_case_id', $case->id)->get();
            $this->info("  - Acciones: " . $actions->count());
            
            foreach ($actions as $action) {
                $this->info("    * Acción: {$action->action_type}");
                $this->info("    * Descripción: {$action->action_description}");
                $this->info("    * Metadata: " . json_encode($action->metadata));
            }
        }

        // Verificar si puede apelar
        $canAppeal = false;
        if ($publication->is_hidden && $cases->isNotEmpty()) {
            $latestCase = $cases->first();
            if ($latestCase->source === 'auto_moderation') {
                $canAppeal = true;
            } else {
                $canAppeal = !in_array($latestCase->status, ['closed', 'action_taken']);
            }
        }

        $this->info("Puede apelar: " . ($canAppeal ? 'Sí' : 'No'));
    }

    private function checkAllAutoModeration()
    {
        $this->info("=== TODOS LOS CASOS DE AUTO-MODERACIÓN ===");
        
        $cases = ModerationCase::where('source', 'auto_moderation')
            ->with(['publication', 'actions'])
            ->get();

        $this->info("Casos encontrados: " . $cases->count());
        
        foreach ($cases as $case) {
            $this->info("Caso ID: {$case->id}");
            $this->info("  - Publicación: {$case->publication->title} (ID: {$case->publication->id})");
            $this->info("  - Estado: {$case->status}");
            $this->info("  - Oculto: " . ($case->publication->is_hidden ? 'Sí' : 'No'));
            $this->info("  - Acciones: " . $case->actions->count());
            
            foreach ($case->actions as $action) {
                $this->info("    * {$action->action_type}: {$action->action_description}");
            }
            
            $this->newLine();
        }
    }
}
