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
        Schema::create('products', function (Blueprint $table) {
            $table->uuid();
            $table->string('title');
            $table->string('description');
            $table->decimal('price');
            $table->magellanGeography('location', 4326);
            $table->boolean('disponibility');
            $table->foreignId('category_id')
                ->constrained('categories', 'id')
                ->cascadeOnDelete();
            $table->foreignId('created_by')
                ->constrained('users', 'id')
                ->cascadeOnDelete();
            $table->dateTime('published_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
