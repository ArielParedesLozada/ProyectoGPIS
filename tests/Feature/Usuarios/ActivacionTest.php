<?php

use App\Enums\RoleType;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('INT-USU-047', function () {
    $admin = User::factory(['role' => RoleType::ADMIN->value])->create();
    $vendor = User::factory(['role' => RoleType::VENDEDOR->value, 'is_active' => true])->create();
    $buyer = User::factory(['role' => RoleType::COMPRADOR->value, 'is_active' => false])->create();
    actingAs($admin)
        ->get(route('admin.vendors.index'))
        ->assertStatus(200);
    actingAs($admin)
        ->patch(route('admin.vendors.toggle-status', ['vendor' => $vendor->id, '_token' => csrf_token()]))
        ->assertSessionHas('success');
    actingAs($admin)
        ->patch(route('admin.buyers.toggle-status', ['buyer' => $buyer->id, '_token' => csrf_token()]))
        ->assertSessionHas('success');
    assertDatabaseHas('users', [
        'id' => $vendor->id,
        'is_active' => false
    ]);
    assertDatabaseHas('users', [
        'id' => $buyer->id,
        'is_active' => true
    ]);
});

test('INT-USU-048', function () {
    $admin = User::factory(['role' => RoleType::MODERADOR->value])->create();
    $vendor = User::factory(['role' => RoleType::VENDEDOR->value, 'is_active' => true])->create();
    $buyer = User::factory(['role' => RoleType::COMPRADOR->value, 'is_active' => false])->create();
    actingAs($admin)
        ->get(route('admin.vendors.index'))
        ->assertStatus(200);
    actingAs($admin)
        ->patch(route('admin.vendors.toggle-status', ['vendor' => $vendor->id, '_token' => csrf_token()]))
        ->assertSessionHas('success');
    actingAs($admin)
        ->patch(route('admin.buyers.toggle-status', ['buyer' => $buyer->id, '_token' => csrf_token()]))
        ->assertSessionHas('success');
    assertDatabaseHas('users', [
        'id' => $vendor->id,
        'is_active' => false
    ]);
    assertDatabaseHas('users', [
        'id' => $buyer->id,
        'is_active' => true
    ]);
});

test('INT-USU-049', function () {
    $admin = User::factory(['role' => RoleType::VENDEDOR->value])->create();
    $vendor = User::factory(['role' => RoleType::VENDEDOR->value, 'is_active' => true])->create();
    $buyer = User::factory(['role' => RoleType::COMPRADOR->value, 'is_active' => false])->create();
    actingAs($admin)
        ->get(route('admin.vendors.index'))
        ->assertStatus(403);
    actingAs($admin)
        ->patch(route('admin.vendors.toggle-status', ['vendor' => $vendor->id, '_token' => csrf_token()]))
        ->assertStatus(403);
    actingAs($admin)
        ->patch(route('admin.buyers.toggle-status', ['buyer' => $buyer->id, '_token' => csrf_token()]))
        ->assertStatus(403);
    assertDatabaseHas('users', [
        'id' => $vendor->id,
        'is_active' => true
    ]);
    assertDatabaseHas('users', [
        'id' => $buyer->id,
        'is_active' => false
    ]);
});

test('INT-USU-050', function () {
    $admin = User::factory(['role' => RoleType::ADMIN->value])->create();
    $vendor = User::factory([
        'role' => RoleType::VENDEDOR->value,
        'is_active' => true,
    ])->create();
    actingAs($admin)
        ->get(route('admin.vendors.index'));
    actingAs($admin)
        ->patch(route('admin.vendors.toggle-status', ['vendor' => $vendor->id, '_token' => csrf_token()]));
    actingAs($admin)
        ->post(route('logout', ['_token' => csrf_token()]));
    $this->get(route('login'));
    $response = $this->post(route('login.login', [
        'email' => $vendor->email,
        'password' => 'password', // ← IMPORTANTE
        '_token' => csrf_token(),
    ]));
    $response->assertRedirect(route('login'));
    $response->assertSessionHasErrors([
        'email' => 'Tu cuenta ha sido desactivada. Contacta al administrador.',
        'general' => 'Tu cuenta ha sido desactivada. Contacta al administrador.',
    ]);
});

test('INT-USU-051', function () {
    $admin = User::factory(['role' => RoleType::ADMIN->value])->create();
    $buyer = User::factory([
        'role' => RoleType::COMPRADOR->value,
        'is_active' => true,
    ])->create();
    actingAs($admin)
        ->get(route('admin.buyers.index'));
    actingAs($admin)
        ->patch(route('admin.buyers.toggle-status', ['buyer' => $buyer->id, '_token' => csrf_token()]));
    actingAs($admin)
        ->post(route('logout', ['_token' => csrf_token()]));
    $this->get(route('login'));
    $response = $this->post(route('login.login', [
        'email' => $buyer->email,
        'password' => 'password', // ← IMPORTANTE
        '_token' => csrf_token(),
    ]));
    $response->assertRedirect(route('login'));
    $response->assertSessionHasErrors([
        'email' => 'Tu cuenta ha sido desactivada. Contacta al administrador.',
        'general' => 'Tu cuenta ha sido desactivada. Contacta al administrador.',
    ]);
});
