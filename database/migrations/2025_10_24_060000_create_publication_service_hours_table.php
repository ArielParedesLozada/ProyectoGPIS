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
        Schema::create('publication_service_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->onDelete('cascade');
            $table->tinyInteger('day_of_week')->comment('1=Lunes, 2=Martes, ..., 7=Domingo');
            $table->time('open_time');
            $table->time('close_time');
            $table->timestamps();
            
            // Índice único para evitar duplicados por publicación y día
            $table->unique(['publication_id', 'day_of_week']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publication_service_hours');
    }
};