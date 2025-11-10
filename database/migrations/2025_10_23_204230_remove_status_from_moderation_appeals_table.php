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
        if ($this->isSqliteConnection()) {
            return;
        }

        Schema::table('moderation_appeals', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if ($this->isSqliteConnection()) {
            return;
        }

        Schema::table('moderation_appeals', function (Blueprint $table) {
            $table->string('status')->default('pending');
        });
    }

    private function isSqliteConnection(): bool
    {
        $connection = $this->connection ?? config('database.default');

        return DB::connection($connection)->getDriverName() === 'sqlite';
    }
};
