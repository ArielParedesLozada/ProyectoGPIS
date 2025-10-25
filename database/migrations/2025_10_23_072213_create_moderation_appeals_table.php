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
        Schema::create('moderation_appeals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('moderation_case_id')->constrained()->onDelete('cascade');
            $table->foreignId('appealer_id')->constrained('users')->onDelete('cascade'); // El vendedor que apela
            $table->foreignId('reviewing_moderator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->text('appeal_reason');
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['appealer_id', 'created_at']);
            $table->index(['reviewing_moderator_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moderation_appeals');
    }
};