<?php

namespace Database\Seeders;

use App\Enums\GenderType;
use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'surname' => 'Test Surname', // Campo requerido
                'phone' => '123456789', // Campo único y requerido
                'address' => 'Test Address', // Campo requerido
                'gender' => GenderType::HOMBRE->value, // Campo requerido con enum
                'role' => RoleType::COMPRADOR->value, // Campo requerido con enum
                'status' => StatusType::HABILITADO->value, // Campo requerido con enum
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
    }
}
