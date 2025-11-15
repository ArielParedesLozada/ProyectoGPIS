<?php

namespace App\Observers;

use App\Models\Publication;
use App\Models\ModerationCase;
use Illuminate\Support\Facades\Log;

class PublicationObserver
{
    /**
     * Handle the Publication "deleted" event.
     * Cuando se elimina una publicación (soft delete o hard delete),
     * eliminar con soft delete todos los casos de moderación asociados
     */
    public function deleted(Publication $publication): void
    {
        try {
            // Obtener todos los casos asociados a esta publicación
            $cases = ModerationCase::where('publication_id', $publication->id)->get();

            if ($cases->isEmpty()) {
                Log::info("Publicación {$publication->id} eliminada - No tenía casos de moderación asociados");
                return;
            }

            $deletedCount = 0;
            foreach ($cases as $case) {
                // Hacer soft delete del caso
                $case->delete();
                $deletedCount++;

                Log::info("Caso de moderación {$case->id} eliminado (soft delete) - Publicación {$publication->id} fue eliminada", [
                    'case_id' => $case->id,
                    'publication_id' => $publication->id,
                    'case_status' => $case->status,
                    'deleted_at' => now()->toDateTimeString()
                ]);
            }

            Log::info("Publicación {$publication->id} eliminada - Se eliminaron {$deletedCount} casos de moderación asociados (soft delete)");

        } catch (\Exception $e) {
            Log::error("Error al eliminar casos de moderación cuando se eliminó publicación {$publication->id}: " . $e->getMessage());
        }
    }
}
