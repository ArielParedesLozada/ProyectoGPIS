<?php

use App\Enums\GenderType;
use App\Enums\RoleType;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('Registro View', function () {
    $response = $this->get(route('register'));
    $response->assertStatus(200);
});

test('Registro Correcto', function () {
    $this->get(route('login'));
    $userData = [
        'cedula' => '1850283002', // Diferente al del seeder para evitar unique
        'name' => 'Test Nombre',
        'surname' => 'Test Apellido',
        'phone' => '0981371080', // Único
        'address' => 'Ambato, Tungurahua',
        'gender' => GenderType::HOMBRE->value,
        'role' => 'vendedor', // Usar string directo según validación 'in:comprador,vendedor'
        'email' => 'papu@test.com', // Único
        'password' => 'Admin123@', // Cumple con Rules\Password::defaults()
        'password_confirmation' => 'Admin123@', // DEBE COINCIDIR
        '_token' => csrf_token()

    ];
    $response = $this->post(route('register.store'), $userData);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseHas('users', [
        'email' => 'papu@test.com',
        'email_verified_at' => null
    ]);
});

test('Registro cedula incorrecta', function () {
    $this->get(route('login'));
    $userData = [
        'cedula' => '18502830066', // Diferente al del seeder para evitar unique
        'name' => 'Test Nombre',
        'surname' => 'Test Apellido',
        'phone' => '0981371080', // Único
        'address' => 'Ambato, Tungurahua',
        'gender' => GenderType::HOMBRE->value,
        'role' => 'vendedor', // Usar string directo según validación 'in:comprador,vendedor'
        'email' => 'papu@test.com', // Único
        'password' => 'Admin123@', // Cumple con Rules\Password::defaults()
        'password_confirmation' => 'Admin123@', // DEBE COINCIDIR
        '_token' => csrf_token()

    ];
    $response = $this->post(route('register.store'), $userData);
    $this->assertDatabaseCount('users', 0);
});

test('Registro rol incorrecto', function () {
    $this->get(route('login'));
    $userData = [
        'cedula' => '18502830066', // Diferente al del seeder para evitar unique
        'name' => 'Test Nombre',
        'surname' => 'Test Apellido',
        'phone' => '0981371080', // Único
        'address' => 'Ambato, Tungurahua',
        'gender' => GenderType::HOMBRE->value,
        'role' => RoleType::ADMIN->value, // Usar string directo según validación 'in:comprador,vendedor'
        'email' => 'papu@test.com', // Único
        'password' => 'Admin123@', // Cumple con Rules\Password::defaults()
        'password_confirmation' => 'Admin123@', // DEBE COINCIDIR
        '_token' => csrf_token()

    ];
    $response = $this->post(route('register.store'), $userData);
    $this->assertDatabaseCount('users', 0);
});

test('Registro email repetido', function () {
    $user = User::factory()->create();
    $this->get(route('login'));
    $userData = [
        'cedula' => '18502830066', // Diferente al del seeder para evitar unique
        'name' => 'Test Nombre',
        'surname' => 'Test Apellido',
        'phone' => '0981371080', // Único
        'address' => 'Ambato, Tungurahua',
        'gender' => GenderType::HOMBRE->value,
        'role' => RoleType::ADMIN->value, // Usar string directo según validación 'in:comprador,vendedor'
        'email' => $user->email, // Único
        'password' => 'Admin123@', // Cumple con Rules\Password::defaults()
        'password_confirmation' => 'Admin123@', // DEBE COINCIDIR
        '_token' => csrf_token()

    ];
    $response = $this->post(route('register.store'), $userData);
    $this->assertDatabaseCount('users', 1);
});