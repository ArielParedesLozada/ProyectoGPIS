<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('Login View', function () {
    $response = $this->get(route('login'));
    $response->assertStatus(200);
});

test('Login Correcto', function () {
    $user = User::factory()->create();
    $this->get(route('login'));
    $response = $this->post(route('login.login'), [
        'email' => $user->email,
        'password' => 'password',
        '_token' => csrf_token() // Incluir el token CSRF
    ]);
    $this->assertAuthenticated();
    $response->assertRedirect(route('publication-index', absolute: false));
});

test('Login Incorrecto', function () {
    $user = User::factory()->create();
    $this->get(route('login'));
    $response = $this->post(route('login.login'), [
        'email' => $user->email,
        'password' => 'junk',
        '_token' => csrf_token() // Incluir el token CSRF
    ]);
    $this->assertGuest();
    $response->assertRedirect(route('login', absolute: false));
});

test('Logout', function () {
    $user = User::factory()->create();
    $this->get(route('login'));
    $response = $this
        ->actingAs($user)
        ->post(route('logout'), [
            '_token' => csrf_token()
        ]);
    $response->assertRedirect('/');
    $this->assertGuest();
});
