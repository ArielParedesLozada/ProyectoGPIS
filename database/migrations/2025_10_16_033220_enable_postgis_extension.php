<?php

use Clickbar\Magellan\Schema\MagellanSchema;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class() extends Migration
{
    public function up(): void
    {
        if ($this->isPostgresConnection()) {
            MagellanSchema::enablePostgisIfNotExists($this->connection);
        }
    }

    public function down(): void
    {
        if ($this->isPostgresConnection()) {
            MagellanSchema::disablePostgisIfExists($this->connection);
        }
    }

    private function isPostgresConnection(): bool
    {
        $connection = $this->connection ?? config('database.default');

        return DB::connection($connection)->getDriverName() === 'pgsql';
    }
};
