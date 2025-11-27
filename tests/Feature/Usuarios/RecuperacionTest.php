<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

use function Pest\Laravel\get;
use function Pest\Laravel\post;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create([
        'email' => 'johanatreidesi66@gmail.com',
        'email_verified_at' => now(),
    ]);
});

test('INT-USU-012', function () {
    Notification::fake();
    $page = get(route('password.request'));
    $page->assertStatus(200);
    $user = User::where('email', 'johanatreidesi66@gmail.com')->first();
    post(route('password.email'), ['email' => 'johanatreidesi66@gmail.com', '_token' => csrf_token()])
        ->assertSessionHas('status',  __('A reset link will be sent if the account exists.'));
    Notification::assertSentTo(
        [$user],
        ResetPassword::class
    );
});

test('INT-USU-013', function () {
    Notification::fake();
    get(route('password.request'));
    $user = User::where('email', 'johanatreidesi66@gmail.com')->first();
    post(route('password.email'), ['email' => 'johanatreidesi66@gmail.com', '_token' => csrf_token()]);
    Notification::assertSentTo([$user], ResetPassword::class, function ($notification) {
        $response = $this->get(route('password.reset', $notification->token));
        return $response->assertStatus(200);
    });
});

test('INT-USU-014', function () {
    Notification::fake();
    $user = User::where('email', 'johanatreidesi66@gmail.com')->first();
    get(route('password.request'))->assertStatus(200);
    post(route('password.email'), [
        'email' => $user->email,
        '_token' => csrf_token(),
    ])->assertSessionHas('status');
    Notification::assertSentTo($user, ResetPassword::class);
    $notification = Notification::sent($user, ResetPassword::class)->first();
    $token = $notification->token;
    $resetPage = get(route('password.reset', $token));
    $resetPage->assertStatus(200);
    post(route('password.store'), [
        '_token' => csrf_token(),
        'email' => $user->email,
        'token' => $token,
        'password' => 'Zombie123@',
        'password_confirmation' => 'Zombie123@',
    ])->assertRedirect(route('login'));
    $this->assertTrue(
        Hash::check('Zombie123@', $user->fresh()->password),
        'La contraseña del usuario no fue actualizada correctamente.'
    );
});

test('INT-USU-015', function () {
    Notification::fake();
    $user = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $user->email_verified_at = null;
    $user->save();
    post(route('password.email'), [
        'email' => $user->email,
        '_token' => csrf_token(),
    ]);
    Notification::assertNotSentTo($user, ResetPassword::class);
});


test('INT-USU-016', function () {
    Notification::fake();
    $user = User::where('email', 'johanatreidesi66@gmail.com')->first();

    $tokenPlain = Str::random(40);
    $tokenHashed = Hash::make($tokenPlain);

    DB::table('password_reset_tokens')->insert([
        'email' => $user->email,
        'token' => $tokenHashed,
        'created_at' => Carbon::now()->subHours(2),
    ]);
    $response = post(route('password.store'), [
        '_token' => csrf_token(),
        'email' => $user->email,
        'token' => $tokenPlain,
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ]);

    $this->assertFalse(
        Hash::check('NewPassword123!', $user->fresh()->password),
        'La contraseña NO debería actualizarse si el token está expirado.'
    );
});
