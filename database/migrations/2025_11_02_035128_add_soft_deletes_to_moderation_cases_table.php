<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('moderation_cases', function (Blueprint $table) {
            // Agregar soft deletes
            $table->softDeletes();
            
            // Cambiar la foreign key para que no elimine en cascade (usar set null)
            $table->dropForeign(['publication_id']);
            $table->foreign('publication_id')
                ->references('id')
                ->on('publications')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('moderation_cases', function (Blueprint $table) {
            // Restaurar foreign key original con cascade
            $table->dropForeign(['publication_id']);
            $table->foreign('publication_id')
                ->references('id')
                ->on('publications')
                ->onDelete('cascade');
            
            // Eliminar soft deletes
            $table->dropSoftDeletes();
        });
    }
};
