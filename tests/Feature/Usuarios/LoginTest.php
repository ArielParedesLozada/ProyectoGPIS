<?php

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('INT-001: Visualiza pagina', function () {
    $response = $this->get(route('login'));
    $response->assertStatus(200);
});

test('INT-002: Login correcto', function () {
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

test('INT-003: Login incorrecto', function () {
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

test('INT-004: Login no verificado', function () {
    $user = User::factory()->create();
    $user->email_verified_at = null;
    Log::info('Info del usuario', [
        'user' => $user,
        'verificado' => $user->hasVerifiedEmail(),
    ]);
    $user->save();
    $this->get(route('login'));
    $response = $this->post(route('login.login'), [
        'email' => $user->email,
        'password' => 'password',
        '_token' => csrf_token() // Incluir el token CSRF
    ]);
    $this->assertAuthenticated();
    $response->assertRedirect(route('verification.notice', absolute: false));
});

test('INT-005: Logout', function () {
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
