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
        Schema::table('publications', function (Blueprint $table) {
            $table->dropColumn('horario');
        });
        
        Schema::table('publications', function (Blueprint $table) {
            $table->string('horario')->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            $table->dropColumn('horario');
        });
        
        Schema::table('publications', function (Blueprint $table) {
            $table->dateTime('horario')->nullable()->after('type');
        });
    }
};
