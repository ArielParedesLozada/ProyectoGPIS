<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Eliminar el constraint existente si existe
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
        
        // Recrear la columna role con el constraint correcto
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
        
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['super_admin', 'admin', 'moderador', 'vendedor', 'comprador'])
                  ->default('comprador')
                  ->after('gender');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Eliminar el constraint
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
        
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'moderador', 'vendedor', 'comprador'])
                  ->default('comprador')
                  ->after('gender');
        });
    }
};