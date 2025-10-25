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
        Schema::create('moderation_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->onDelete('cascade');
            $table->foreignId('assigned_moderator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('status', ['pending', 'triage', 'in_review', 'action_taken', 'dismissed', 'appealed', 'closed'])->default('pending');
            $table->enum('source', ['user', 'system'])->default('user');
            $table->integer('report_count')->default(1);
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['assigned_moderator_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moderation_cases');
    }
};