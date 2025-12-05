<?php

use App\Enums\RoleType;
use App\Mail\AdminUserWelcomeEmail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertSoftDeleted;
use function PHPUnit\Framework\assertEquals;
use function PHPUnit\Framework\assertNotEquals;
use function PHPUnit\Framework\assertNull;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function makeSuperAdmin()
{
    User::factory()->create([
        'cedula' => '1450273001',
        'email' => 'johanatreidesi66@gmail.com',
        'role' => RoleType::SUPER_ADMIN,
        'email_verified_at' => now(),
        'is_active' => true
    ]);
}
function makeAdmin($data = [])
{
    User::factory()->create(array_merge([
        'email' => 'aparedes3001@uta.edu.ec',
        'role' => RoleType::ADMIN->value,
        'email_verified_at' => now(),
        'is_active' => true,
    ], $data));
}

test('INT-USU-032', function () { //Para probar que se pueden crear administradores
    Mail::fake();
    makeSuperAdmin();
    $superadmin = User::where('email', 'johanatreidesi66@gmail.com')->first();
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

    actingAs($superadmin)
        ->post(route('admin.admin.store'), $data)
        ->assertRedirect(route('admin.admin.index'));

    assertDatabaseHas('users', [
        'email' => 'aparedes3001@uta.edu.ec',
        'role' => RoleType::ADMIN->value,
    ]);
    $admin = User::where('email', 'aparedes3001@uta.edu.ec')->first();
    assertNull($admin->email_verified_at);
    Mail::assertQueued(AdminUserWelcomeEmail::class, function ($mail) use ($admin) {
        return $mail->user->id == $admin->id;
    });
});


test('INT-USU-033', function () { // Para probar que un no superadministrador no puede crear administradores
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
        ->post(route('admin.admin.store'), $data)
        ->assertStatus(403);
    assertDatabaseCount('users', 1);
});

test('INT-USU-034', function () { //Para probar que no se crea un usuario administrador si los datos de entrada tiene errores
    Mail::fake();
    makeSuperAdmin();
    makeAdmin([
        'cedula' => '1850287007',
        'phone' => '0987371024'
    ]);
    $superadmin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $this->get(route('login'));
    $data = [
        'cedula' => '1850287007',
        'email' => 'aparedes3001@uta.edu.ec',
        'phone' => '0987371024',
        'address' => 'Calle Falsa',
        'gender' => 'hombre',
        '_token' => csrf_token(),
    ];

    actingAs($superadmin)
        ->post(route('admin.admin.store'), $data)
        ->assertSessionHasErrors('general', 'Ocurrió un error al crear el administrador. Por favor, inténtalo de nuevo.');
    assertDatabaseCount('users', 2);
});

test('INT-USU-035', function () {
    makeSuperAdmin();
    $superadmin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    actingAs($superadmin)
        ->get(route('admin.admin.index'))
        ->assertStatus(200);
});

test('INT-USU-036', function () {
    User::factory(['role' => RoleType::COMPRADOR])->create();
    $user = User::where('role', RoleType::COMPRADOR->value)->first();
    actingAs($user)
        ->get(route('admin.admin.index'))
        ->assertStatus(403);
});

test('INT-USU-037', function () {
    makeSuperAdmin();
    makeAdmin();
    $superadmin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    $admin = User::where('email', 'aparedes3001@uta.edu.ec')->first();
    assertEquals(RoleType::SUPER_ADMIN->value, $superadmin->role);
    assertEquals(RoleType::ADMIN->value, $admin->role);
    actingAs($superadmin)
        ->get(route('admin.admin.show', ['admin' => $admin->id]))
        ->assertStatus(200);
});

test('INT-USU-038', function () {
    makeAdmin();
    User::factory(['role' => RoleType::COMPRADOR])->create();
    $user = User::where('role', RoleType::COMPRADOR->value)->first();
    $admin = User::where('email', 'aparedes3001@uta.edu.ec')->first();
    assertEquals(RoleType::ADMIN->value, $admin->role);
    actingAs($user)
        ->get(route('admin.admin.show', ['admin' => $admin->id]))
        ->assertStatus(403);
});

test('INT-USU-039', function () {
    makeSuperAdmin();
    makeAdmin();
    $superadmin = User::where('email', 'johanatreidesi66@gmail.com')->first();
    User::factory(['role' => RoleType::COMPRADOR])->create();
    $user = User::where('role', RoleType::COMPRADOR->value)->first();
    assertEquals(RoleType::SUPER_ADMIN->value, $superadmin->role);
    assertNotEquals(RoleType::ADMIN->value, $user->role);
    actingAs($superadmin)
        ->get(route('admin.admin.show', ['admin' => $user->id]))
        ->assertStatus(404);
});

test('INT-USU-040', function () {
    makeSuperAdmin();
    $superadmin = User::first();

    makeAdmin([
        'cedula' => '0123456789',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'email' => 'old@example.com',
        'phone' => '0990001122',
        'address' => 'Antigua calle',
        'gender' => 'hombre',
    ]);
    $admin = User::where('email', 'old@example.com')->first();
    actingAs($superadmin)
        ->get(route('admin.admin.edit', ['admin' => $admin->id]))
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

    actingAs($superadmin)
        ->patch(route('admin.admin.update', $admin->id), $data)
        ->assertRedirect(route('admin.admin.index'));

    assertDatabaseHas('users', [
        'id' => $admin->id,
        'cedula' => '9999999999',
        'email' => 'old@example.com',
        'name' => 'Matusalen',
        'surname' => 'Matute',
    ]);
});

test('INT-USU-041', function () {
    makeSuperAdmin();
    $superadmin = User::first();

    makeAdmin([
        'cedula' => '0123456789',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'email' => 'old@example.com',
        'phone' => '0990001122',
        'address' => 'Antigua calle',
        'gender' => 'hombre',
    ]);
    $admin = User::where('email', 'old@example.com')->first();
    actingAs($superadmin)
        ->get(route('admin.admin.edit', ['admin' => $admin->id]))
        ->assertStatus(200);
    $data = [
        'cedula' => '1450273001', // cedula ya usada
        'phone' => null,
        'name' => '',
        'address' => 'Nueva direccion',
        '_token' => csrf_token(),
    ];

    actingAs($superadmin)
        ->patch(route('admin.admin.update', $admin->id), $data)
        ->assertInvalid([
            'cedula',
            'name',
            'surname',
            'phone',
            'gender',
            'email'
        ]);
    assertDatabaseHas('users', [
        'id' => $admin->id,
        'email' => 'old@example.com',
        'cedula' => '0123456789',
    ]);
});

test('INT-USU-042', function () {
    User::factory(['role' => RoleType::COMPRADOR->value])->create();
    $user = User::first();
    makeAdmin([
        'cedula' => '0123456789',
        'name' => 'Matusalen',
        'surname' => 'Matute',
        'email' => 'old@example.com',
        'phone' => '0990001122',
        'address' => 'Antigua calle',
        'gender' => 'hombre',
    ]);
    $admin = User::where('email', 'old@example.com')->first();
    actingAs($user)
        ->get(route('admin.admin.edit', ['admin' => $admin->id]))
        ->assertStatus(403);
    $data = [
        'name' => 'Pedro',
        'address' => 'Nueva direccion',
        '_token' => csrf_token(),
    ];
    actingAs($user)
        ->patch(route('admin.admin.update', $admin->id), $data)
        ->assertStatus(403);
    assertDatabaseHas('users', [
        'id' => $admin->id,
        'email' => 'old@example.com',
        'cedula' => '0123456789',
    ]);
});

test('INT-USU-043', function () {
    User::factory([
        'role' => RoleType::COMPRADOR->value,
        'name' => 'Juan',
        'address' => 'Calle antigua'
    ])->create();
    $user = User::first();
    makeSuperAdmin();
    $superadmin = User::where('role', RoleType::SUPER_ADMIN->value)->first();
    actingAs($superadmin)
        ->get(route('admin.admin.edit', ['admin' => $user->id]))
        ->assertStatus(404);
    $data = [
        'name' => 'Pedro',
        'address' => 'Nueva direccion',
        '_token' => csrf_token(),
    ];
    actingAs($superadmin)
        ->patch(route('admin.admin.update', $user->id), $data)
        ->assertStatus(404);
    assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Juan',
        'address' => 'Calle antigua',
    ]);
});

test('INT-USU-044', function () {
    makeSuperAdmin();
    $superadmin = User::first();
    makeAdmin();
    $admin = User::where('role', RoleType::ADMIN->value)->first();
    actingAs($superadmin)
        ->get(route('admin.admin.index'));
    actingAs($superadmin)
        ->delete(route('admin.admin.destroy', ['admin' => $admin->id, '_token' => csrf_token()]))
        ->assertRedirect(route('admin.admin.index'));
    assertSoftDeleted('users', ['id' => $admin->id]);
    assertDatabaseHas('users', [
        'id' => $admin->id,
        'role' => RoleType::ADMIN->value
    ]);
});

test('INT-USU-045', function () {
    User::factory(['role' => RoleType::SUPER_ADMIN->value,])->create();
    $superadmin = User::first();
    User::factory([
        'role' => RoleType::ADMIN->value,
        'is_active' => false,
        'email' => 'inactive@gmail.com'
    ])->create();
    User::factory([
        'role' => RoleType::ADMIN->value,
        'is_active' => true,
        'email' => 'active@gmail.com'
    ])->create();
    $active = User::where('email', 'active@gmail.com')->first();
    $inactive = User::where('email', 'inactive@gmail.com')->first();
    actingAs($superadmin)
        ->get(route('admin.admin.index'));
    actingAs($superadmin)
        ->patch(route('admin.admin.toggle-status', ['admin' => $inactive->id, '_token' => csrf_token()]))
        ->assertSessionHas('success', "Administrador activado exitosamente.");
    assertDatabaseHas('users', [
        'id' => $inactive->id,
        'is_active' => true,
    ]);
    actingAs($superadmin)
        ->patch(route('admin.admin.toggle-status', ['admin' => $active->id, '_token' => csrf_token()]))
        ->assertSessionHas('success', "Administrador desactivado exitosamente.");
    assertDatabaseHas('users', [
        'id' => $active->id,
        'is_active' => false,
    ]);
});

test('INT-USU-046', function () {
    User::factory(['role' => RoleType::VENDEDOR->value,])->create();
    $superadmin = User::first();
    User::factory([
        'role' => RoleType::ADMIN->value,
        'is_active' => false,
        'email' => 'inactive@gmail.com'
    ])->create();
    User::factory([
        'role' => RoleType::ADMIN->value,
        'is_active' => true,
        'email' => 'active@gmail.com'
    ])->create();
    $active = User::where('email', 'active@gmail.com')->first();
    $inactive = User::where('email', 'inactive@gmail.com')->first();
    actingAs($superadmin)
        ->get(route('admin.admin.index'));
    actingAs($superadmin)
        ->patch(route('admin.admin.toggle-status', ['admin' => $inactive->id, '_token' => csrf_token()]))
        ->assertStatus(403);
    assertDatabaseHas('users', [
        'id' => $inactive->id,
        'is_active' => false,
    ]);
    actingAs($superadmin)
        ->patch(route('admin.admin.toggle-status', ['admin' => $active->id, '_token' => csrf_token()]))
        ->assertStatus(403);
    assertDatabaseHas('users', [
        'id' => $active->id,
        'is_active' => true,
    ]);
});