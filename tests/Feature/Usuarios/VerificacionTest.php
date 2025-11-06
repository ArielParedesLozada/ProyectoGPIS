<?php

use App\Mail\CustomEmailVerification;
use App\Models\User;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Mail;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('INT-008: Envio de correo de verificacion', function () {
    Mail::fake();
    $userData = [
        'cedula' => '1890773041',
        'name' => 'Juan',
        'surname' => 'Atreides',
        'phone' => '0987551827',
        'address' => 'Calle de Juan',
        'gender' => 'hombre',
        'role' => 'vendedor',
        'email' => 'johanatreidesi66@gmail.com',
        'password' => 'Admin123@',
        'password_confirmation' => 'Admin123@',
        '_token' => csrf_token(),
    ];

    $response = $this->post(route('register.store'), $userData);
    $user = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertSessionHas('status', 'verification-link-sent');

    Mail::assertQueued(CustomEmailVerification::class, function ($mail) use ($user) {
        return $mail->user->email == $user->email;
    });
});

test('INT-009: Verificacion con correo valido', function () {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    $this->actingAs($user)
        ->get($verificationUrl)
        ->assertRedirectContains(route('publication-index')); // o la ruta de tu home de publicaciones

    $this->assertNotNull($user->email_verified_at);
    $this->assertAuthenticated();
});

test('INT-010: Enlace expirado no funciona', function () {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->subMinutes(1), // ya expirado
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    $this->actingAs($user)
        ->get($verificationUrl)
        ->assertForbidden(); // o assertStatus(403)

    $this->assertFalse($user->fresh()->hasVerifiedEmail());
});

test('INT-011: Reenvio de correo para un usuario', function () {
    Mail::fake();

    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertSessionHas('status', 'verification-link-sent');
    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertSessionHas('status', 'verification-link-sent');
    Mail::assertQueued(CustomEmailVerification::class, function ($mail) use ($user) {
        return $mail->user->id === $user->id;
    });
    Mail::assertQueuedCount(2);
});