<?php

use App\Enums\GenderType;
use App\Enums\RoleType;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('INT-006: Registro correcto', function () {
    $this->get(route('login'));
    $userData = [
        'cedula' => '1890773041', // Diferente al del seeder para evitar unique
        'name' => 'Juan',
        'surname' => 'Atreides',
        'phone' => '0987551827', // Único
        'address' => 'Calle de Juan',
        'gender' => GenderType::HOMBRE->value,
        'role' => 'vendedor', // Usar string directo según validación 'in:comprador,vendedor'
        'email' => 'johanatreidesi66@gmail.com', // Único
        'password' => 'Admin123@', // Cumple con Rules\Password::defaults()
        'password_confirmation' => 'Admin123@', // DEBE COINCIDIR
        '_token' => csrf_token()
    ];
    $response = $this->post(route('register.store'), $userData);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseHas('users', [
        'email' => 'johanatreidesi66@gmail.com',
        'email_verified_at' => null
    ]);
    $response->assertRedirect(route('verification.notice', absolute: false));
});

test('INT-007 : Registro incorrecto', function () {
    $this->get(route('login'));
    $user = User::factory()->create([
        'email' => 'johanatreidesi66@gmail.com',
        'phone' => '0987551827'
    ]);
    $userData = [
        'cedula' => '', // Diferente al del seeder para evitar unique
        'name' => 'Juan',
        'surname' => 'Atreides',
        'phone' => '0987551827', // Único
        'address' => 'Calle de Juan',
        'gender' => '',
        'role' => RoleType::ADMIN->value, // Usar string directo según validación 'in:comprador,vendedor'
        'email' => 'johanatreidesi66@gmail.com', // Único
        'password' => 'Admin123@', // Cumple con Rules\Password::defaults()
        'password_confirmation' => 'Admin123@', // DEBE COINCIDIR
        '_token' => csrf_token()
    ];
    $response = $this->post(route('register.store'), $userData);
    $response->assertInvalid([
        'cedula',
        'phone',
        'gender',
        'role',
        'email'
    ]);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseHas('users', [
        'email' => 'johanatreidesi66@gmail.com',
    ]);
});
