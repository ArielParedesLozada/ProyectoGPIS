<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/incident-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    Http::fake([
        'nominatim.openstreetmap.org/*' => Http::response([
            'address' => [
                'suburb' => 'Centro',
                'city' => 'Ambato',
                'country' => 'Ecuador',
            ],
        ]),
    ]);

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

    $this->anotherModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->category = Category::factory()->create();
});

test('INT-027: el historial registra todas las acciones sobre una incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHours(3),
    ]);

    // Primera acción: ocultar por moderador original
    $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Violación de políticas',
        ]);

    $case->refresh();
    $publication->refresh();
    expect($publication->is_hidden)->toBeTrue();

    // Preparar apelación y reasignar al segundo moderador
    $case->update([
        'status' => 'appealed',
        'assigned_moderator_id' => $this->anotherModerator->id,
        'assigned_at' => now(),
    ]);

    ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => $this->anotherModerator->id,
        'action_type' => 'reassign_case',
        'action_description' => 'Caso asignado para revisión de apelación',
    ]);

    // Segunda acción: confirmar decisión final
    $this->actingAs($this->anotherModerator)
        ->post(route('moderation.confirm-hide-decision', $case->id), [
            'notes' => 'Se mantiene la decisión original',
        ]);

    $case->refresh();
    expect($case->status)->toBe('closed');

    $actions = ModerationAction::where('moderation_case_id', $case->id)
        ->orderBy('created_at')
        ->pluck('action_type')
        ->toArray();

    expect($actions)->toContain('hide_publication');
    expect($actions)->toContain('reassign_case');
    expect($actions)->toContain('close_case');
});

test('INT-028: el sistema entrega estadísticas correctas de incidencias', function () {
    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'in_review',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category, ['is_hidden' => true]), [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'assigned_moderator_id' => null,
    ]);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index'));

    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->where('stats.total_cases', 4)
        ->where('stats.pending_cases', 2)
        ->where('stats.in_review_cases', 1)
        ->where('stats.appealed_cases', 1)
        ->where('stats.my_cases', 3)
        ->where('stats.unassigned_cases', 1)
    );
});

test('INT-029: permite listar y filtrar incidencias por estado y ordenar por fecha', function () {
    $recentCase = createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'created_at' => now(),
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'created_at' => now()->subDay(),
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'closed',
        'created_at' => now()->subDays(2),
        'resolved_at' => now()->subDay(),
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDays(2),
    ]);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['status' => 'pending']));

    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 2)
        ->where('cases.data.0.status', 'pending')
        ->where('cases.data.1.status', 'pending')
        ->where('cases.data', function ($cases) {
            $cases = $cases instanceof \Illuminate\Support\Collection ? $cases->toArray() : $cases;
            return $cases[0]['created_at'] >= $cases[1]['created_at'];
        })
    );
});



