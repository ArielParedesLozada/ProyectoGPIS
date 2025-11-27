<?php

use App\Enums\RoleType;
use App\Mail\AdminUserWelcomeEmail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\assertSoftDeleted;
use function Pest\Laravel\get;
use function PHPUnit\Framework\assertEquals;
use function PHPUnit\Framework\assertFalse;
use function PHPUnit\Framework\assertNotEquals;
use function PHPUnit\Framework\assertNull;
use function PHPUnit\Framework\assertTrue;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function makeAdmin()
{
    User::factory()->create([
        'cedula' => '1450273001',
        'email' => 'johanatreidesi66@gmail.com',
        'role' => RoleType::ADMIN,
        'email_verified_at' => now(),
        'is_active' => true
    ]);
}
function makeModerator($data = [])
{
    User::factory()->create(array_merge([
        'email' => 'aparedes3001@uta.edu.ec',
        'role' => RoleType::MODERADOR->value,
        'email_verified_at' => now(),
        'is_active' => true,
    ], $data));
}

test('INT-USU-017', function () { //Para probar que se pueden crear moderadores
    Mail::fake();
    makeAdmin();
    $admin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $this->get(route('login'));
    $data = [
        'cedula' => '1234567890',
        'name' => 'John',
        'surname' => 'Doe',
        'email' => 'aparedes3001@uta.edu.ec',
        'password' => 'Password123@',
        'password_confirmation' => 'Password123@',
        'phone' => '0991234567',
        'address' => 'Calle Falsa',
        'gender' => 'hombre',
        '_token' => csrf_token(),
    ];

    actingAs($admin)
        ->post(route('admin.moderators.store'), $data)
        ->assertRedirect(route('admin.moderators.index'));

    assertDatabaseHas('users', [
        'email' => 'aparedes3001@uta.edu.ec',
        'role' => RoleType::MODERADOR->value,
    ]);
    $moderator = User::where('email', 'aparedes3001@uta.edu.ec')->first();
    assertNull($moderator->email_verified_at);
    Mail::assertQueued(AdminUserWelcomeEmail::class, function ($mail) use ($moderator) {
        return $mail->user->id == $moderator->id;
    });
});


test('INT-USU-018', function () { // Para probar que un no administrador no puede crear moderadores
    $this->get(route('login'));
    $data = [
        'cedula' => '1234567890',
        'name' => 'John',
        'surname' => 'Doe',
        'email' => 'aparedes3001@uta.edu.ec',
        'password' => 'Password123@',
        'password_confirmation' => 'Password123@',
        'phone' => '0991234567',
        'address' => 'Calle Falsa',
        'gender' => 'hombre',
        '_token' => csrf_token(),
    ];
    User::factory([
        'email' => 'locate@me.com',
        'role' => RoleType::COMPRADOR->value,
    ])->create();
    $user = User::where('email', 'locate@me.com')->first();
    actingAs($user)
        ->post(route('admin.moderators.store'), $data)
        ->assertStatus(403);
    assertDatabaseCount('users', 1);
});

test('INT-USU-019', function () { //Para probar que no se crea un usuario moderador si los datos de entrada tiene errores
    Mail::fake();
    makeAdmin();
    makeModerator([
        'cedula' => '1850287007',
        'phone' => '0987371024'
    ]);
    $admin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $this->get(route('login'));
    $data = [
        'cedula' => '1850287007',
        'email' => 'aparedes3001@uta.edu.ec',
        'phone' => '0987371024',
        'address' => 'Calle Falsa',
        'gender' => 'hombre',
        '_token' => csrf_token(),
    ];

    actingAs($admin)
        ->post(route('admin.moderators.store'), $data)
        ->assertSessionHasErrors('general', 'Ocurrió un error al crear el moderador. Por favor, inténtalo de nuevo.');
    assertDatabaseCount('users', 2);
});

test('INT-USU-020', function () {
    makeAdmin();
    $admin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    actingAs($admin)
        ->get(route('admin.moderators.index'))
        ->assertStatus(200);
});

test('INT-USU-021', function () {
    User::factory(['role' => RoleType::COMPRADOR])->create();
    $user = User::where('role', RoleType::COMPRADOR->value)->first();
    actingAs($user)
        ->get(route('admin.moderators.index'))
        ->assertStatus(403);
});

test('INT-USU-022', function () {
    makeAdmin();
    makeModerator();
    $admin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $moderator = User::where('email', 'aparedes3001@uta.edu.ec')->first();
    assertEquals(RoleType::ADMIN->value, $admin->role);
    assertEquals(RoleType::MODERADOR->value, $moderator->role);
    actingAs($admin)
        ->get(route('admin.moderators.show', ['moderator' => $moderator->id]))
        ->assertStatus(200);
});

test('INT-USU-023', function () {
    makeModerator();
    User::factory(['role' => RoleType::COMPRADOR])->create();
    $user = User::where('role', RoleType::COMPRADOR->value)->first();
    $moderator = User::where('email', 'aparedes3001@uta.edu.ec')->first();
    assertEquals(RoleType::MODERADOR->value, $moderator->role);
    actingAs($user)
        ->get(route('admin.moderators.show', ['moderator' => $moderator->id]))
        ->assertStatus(403);
});

test('INT-USU-024', function () {
    makeAdmin();
    makeModerator();
    $admin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    User::factory(['role' => RoleType::COMPRADOR])->create();
    $user = User::where('role', RoleType::COMPRADOR->value)->first();
    assertEquals(RoleType::ADMIN->value, $admin->role);
    assertNotEquals(RoleType::MODERADOR->value, $user->role);
    actingAs($admin)
        ->get(route('admin.moderators.show', ['moderator' => $user->id]))
        ->assertStatus(404);
});

test('INT-USU-025', function () {
    makeAdmin();
    $admin = User::first();

    makeModerator([
        'cedula' => '0123456789',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'email' => 'old@example.com',
        'phone' => '0990001122',
        'address' => 'Antigua calle',
        'gender' => 'hombre',
    ]);
    $moderator = User::where('email', 'old@example.com')->first();
    actingAs($admin)
        ->get(route('admin.moderators.edit', ['moderator' => $moderator->id]))
        ->assertStatus(200);
    $data = [
        'cedula' => '9999999999',
        'email' => 'nuevo@example.com',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'phone' => '0991234567',
        'address' => 'Nueva dirección',
        'gender' => 'hombre',
        '_token' => csrf_token(),
    ];

    actingAs($admin)
        ->patch(route('admin.moderators.update', $moderator->id), $data)
        ->assertRedirect(route('admin.moderators.index'));

    assertDatabaseHas('users', [
        'id' => $moderator->id,
        'cedula' => '9999999999',
        'email' => 'old@example.com',
        'name' => 'Matusalen',
        'surname' => 'Matute',
    ]);
});

test('INT-USU-026', function () {
    makeAdmin();
    $admin = User::first();

    makeModerator([
        'cedula' => '0123456789',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'email' => 'old@example.com',
        'phone' => '0990001122',
        'address' => 'Antigua calle',
        'gender' => 'hombre',
    ]);
    $moderator = User::where('email', 'old@example.com')->first();
    actingAs($admin)
        ->get(route('admin.moderators.edit', ['moderator' => $moderator->id]))
        ->assertStatus(200);
    $data = [
        'cedula' => '1450273001', // cedula ya usada
        'phone' => null,
        'name' => '',
        'address' => 'Nueva direccion',
        '_token' => csrf_token(),
    ];

    actingAs($admin)
        ->patch(route('admin.moderators.update', $moderator->id), $data)
        ->assertInvalid([
            'cedula',
            'name',
            'surname',
            'phone',
            'gender',
            'email'
        ]);
    assertDatabaseHas('users', [
        'id' => $moderator->id,
        'email' => 'old@example.com',
        'cedula' => '0123456789',
    ]);
});

test('INT-USU-027', function () {
    User::factory(['role' => RoleType::COMPRADOR->value])->create();
    $user = User::first();
    makeModerator([
        'cedula' => '0123456789',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'email' => 'old@example.com',
        'phone' => '0990001122',
        'address' => 'Antigua calle',
        'gender' => 'hombre',
    ]);
    $moderator = User::where('email', 'old@example.com')->first();
    actingAs($user)
        ->get(route('admin.moderators.edit', ['moderator' => $moderator->id]))
        ->assertStatus(403);
    $data = [
        'name' => 'Pedro',
        'address' => 'Nueva direccion',
        '_token' => csrf_token(),
    ];
    actingAs($user)
        ->patch(route('admin.moderators.update', $moderator->id), $data)
        ->assertStatus(403);
    assertDatabaseHas('users', [
        'id' => $moderator->id,
        'email' => 'old@example.com',
        'cedula' => '0123456789',
    ]);
});

test('INT-USU-028', function () {
    User::factory([
        'role' => RoleType::COMPRADOR->value,
        'name' => 'Juan',
        'address' => 'Calle antigua'
    ])->create();
    $user = User::first();
    makeAdmin();
    $admin = User::where('role', RoleType::ADMIN->value)->first();
    actingAs($admin)
        ->get(route('admin.moderators.edit', ['moderator' => $user->id]))
        ->assertStatus(404);
    $data = [
        'name' => 'Pedro',
        'address' => 'Nueva direccion',
        '_token' => csrf_token(),
    ];
    actingAs($admin)
        ->patch(route('admin.moderators.update', $user->id), $data)
        ->assertStatus(404);
    assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Juan',
        'address' => 'Calle antigua',
    ]);
});

test('INT-USU-029', function () {
    makeAdmin();
    $admin = User::first();
    makeModerator();
    $moderator = User::where('role', RoleType::MODERADOR->value)->first();
    actingAs($admin)
        ->get(route('admin.moderators.index'));
    actingAs($admin)
        ->delete(route('admin.moderators.destroy', ['moderator' => $moderator->id, '_token' => csrf_token()]))
        ->assertRedirect(route('admin.moderators.index'));
    assertSoftDeleted('users', ['id' => $moderator->id]);
    assertDatabaseHas('users', [
        'id' => $moderator->id,
        'role' => RoleType::MODERADOR->value
    ]);
});

test('INT-USU-030', function () {
    User::factory(['role' => RoleType::ADMIN->value,])->create();
    $admin = User::first();
    User::factory([
        'role' => RoleType::MODERADOR->value,
        'is_active' => false,
        'email' => 'inactive@gmail.com'
    ])->create();
    User::factory([
        'role' => RoleType::MODERADOR->value,
        'is_active' => true,
        'email' => 'active@gmail.com'
    ])->create();
    $active = User::where('email', 'active@gmail.com')->first();
    $inactive = User::where('email', 'inactive@gmail.com')->first();
    actingAs($admin)
        ->get(route('admin.moderators.index'));
    actingAs($admin)
        ->patch(route('admin.moderators.toggle-status', ['moderator' => $inactive->id, '_token' => csrf_token()]))
        ->assertSessionHas('success', "Moderador activado exitosamente.");
    assertDatabaseHas('users', [
        'id' => $inactive->id,
        'is_active' => true,
    ]);
    actingAs($admin)
        ->patch(route('admin.moderators.toggle-status', ['moderator' => $active->id, '_token' => csrf_token()]))
        ->assertSessionHas('success', "Moderador desactivado exitosamente.");
    assertDatabaseHas('users', [
        'id' => $active->id,
        'is_active' => false,
    ]);
});
