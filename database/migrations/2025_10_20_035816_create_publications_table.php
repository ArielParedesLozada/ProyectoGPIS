<?php

use App\Enums\PublicationType;
use App\Enums\StatusType;
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
        Schema::create('publications', function (Blueprint $table) {
            $table->id();
            $table->uuid('code')->unique();
            $table->string('title');
            $table->text('description');
            $table->decimal('price');
            $table->string('location'); // Cambiado a string para texto legible
            $table->boolean('disponibility');
            $table->foreignId('category_id')
                ->constrained('categories', 'id')
                ->cascadeOnDelete();
            $table->foreignId('created_by')
                ->constrained('users', 'id')
                ->cascadeOnDelete();
            $table->enum('status', array_column(StatusType::cases(), 'value'))->default(StatusType::HABILITADO->value);
            $table->enum('type', array_column(PublicationType::cases(), 'value'))->default(PublicationType::PRODUCT->value);
            $table->dateTime('published_at');
            $table->dateTime('horario')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publications');
    }
};
