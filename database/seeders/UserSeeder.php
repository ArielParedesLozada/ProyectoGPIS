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
            ['email' => 'superadmin@proyectogpis.com'],
            [
                'cedula' => '1850283001',
                'name' => 'Super',
                'surname' => 'Administrador', // Campo requerido
                'phone' => '123456789', // Campo único y requerido
                'address' => 'Dirección del Super Admin', // Campo requerido
                'gender' => GenderType::HOMBRE->value, // Campo requerido con enum
                'role' => RoleType::SUPER_ADMIN->value, // Campo requerido con enum
                'status' => StatusType::HABILITADO->value, // Campo requerido con enum
                'password' => Hash::make('Admin123@'),
                'email_verified_at' => now(),
            ]
        );
    }
}
