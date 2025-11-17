<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/incident-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->vendor = User::factory()->create([
        'role' => RoleType::VENDEDOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->moderator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->category = Category::factory()->create();
});

test('INT-029T: index limpia filtros correctamente', function () {
    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['clear_filters' => true]));

    $response->assertRedirect(route('moderation.index'));
    $response->assertSessionHas('success');
});

test('INT-029U: index valida que date_from no sea mayor que date_to', function () {
    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', [
            'date_from' => now()->addDay()->format('Y-m-d'),
            'date_to' => now()->subDay()->format('Y-m-d'),
        ]));

    $response->assertRedirect();
    $response->assertSessionHas('error');
});

test('INT-029V: index muestra mensaje cuando solo se selecciona date_from', function () {
    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', [
            'date_from' => now()->subDay()->format('Y-m-d'),
        ]));

    $response->assertRedirect();
    $response->assertSessionHas('info');
});

test('INT-029W: index muestra mensaje cuando solo se selecciona date_to', function () {
    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', [
            'date_to' => now()->format('Y-m-d'),
        ]));

    $response->assertRedirect();
    $response->assertSessionHas('info');
});

test('INT-029X: index filtra por status correctamente', function () {
    $publication1 = createTestPublication($this->vendor, $this->category);
    $case1 = createModerationCase($publication1, ['status' => 'pending']);

    $publication2 = createTestPublication($this->vendor, $this->category);
    $case2 = createModerationCase($publication2, ['status' => 'closed']);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['status' => 'pending']));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 1)
        ->where('cases.data.0.id', $case1->id)
    );
});

test('INT-029Y: index filtra por source correctamente', function () {
    $publication1 = createTestPublication($this->vendor, $this->category);
    $case1 = createModerationCase($publication1, ['source' => 'user']);

    $publication2 = createTestPublication($this->vendor, $this->category);
    $case2 = createModerationCase($publication2, ['source' => 'system']);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['source' => 'user']));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 1)
        ->where('cases.data.0.id', $case1->id)
    );
});

test('INT-029Z: index filtra por assigned_to_me correctamente', function () {
    $publication1 = createTestPublication($this->vendor, $this->category);
    $case1 = createModerationCase($publication1, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $publication2 = createTestPublication($this->vendor, $this->category);
    $case2 = createModerationCase($publication2, [
        'assigned_moderator_id' => User::factory()->create()->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['assigned_to_me' => true]));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 1)
        ->where('cases.data.0.id', $case1->id)
    );
});

test('INT-029AA: index filtra por unassigned correctamente', function () {
    $publication1 = createTestPublication($this->vendor, $this->category);
    $case1 = createModerationCase($publication1, [
        'assigned_moderator_id' => null,
    ]);

    $publication2 = createTestPublication($this->vendor, $this->category);
    $case2 = createModerationCase($publication2, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['unassigned' => true]));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 1)
        ->where('cases.data.0.id', $case1->id)
    );
});

test('INT-029AB: index filtra por category_id correctamente', function () {
    $category1 = Category::factory()->create();
    $category2 = Category::factory()->create();

    $publication1 = createTestPublication($this->vendor, $category1);
    $case1 = createModerationCase($publication1);

    $publication2 = createTestPublication($this->vendor, $category2);
    $case2 = createModerationCase($publication2);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['category_id' => $category1->id]));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 1)
        ->where('cases.data.0.id', $case1->id)
    );
});

test('INT-029AC: index filtra por date_from y date_to correctamente', function () {
    // Crear un caso con fecha específica dentro del rango
    $publication1 = createTestPublication($this->vendor, $this->category);
    $case1 = createModerationCase($publication1);
    $case1->update(['created_at' => now()->subDay()]);

    // Filtrar por rango que incluye case1
    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', [
            'date_from' => now()->subDays(2)->format('Y-m-d'),
            'date_to' => now()->format('Y-m-d'),
        ]));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data')
        ->has('filters.date_from')
        ->has('filters.date_to')
    );
    
    // Verificar que case1 está en los resultados
    $cases = $response->original->getData()['page']['props']['cases']['data'];
    $caseIds = collect($cases)->pluck('id')->toArray();
    
    // Verificar que case1 está (debe estar porque está dentro del rango)
    expect($caseIds)->toContain($case1->id);
});

