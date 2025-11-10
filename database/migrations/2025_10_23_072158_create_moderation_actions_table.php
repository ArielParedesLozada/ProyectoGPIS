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
        Schema::create('moderation_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('moderation_case_id')->constrained()->onDelete('cascade');
            $table->foreignId('moderator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action_type');
            $table->text('action_description');
            $table->json('metadata')->nullable(); // Para detalles específicos de la acción
            $table->timestamps();

            $table->index(['moderation_case_id', 'created_at']);
            $table->index(['moderator_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moderation_actions');
    }
};