<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use App\Jobs\ReassignModeratorCasesJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

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

test('INC-001: asigna incidencia al moderador con menor carga de trabajo', function () {
    $lightModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $heavyPublication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    ModerationCase::create([
        'publication_id' => $heavyPublication->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
    ]);

    ModerationCase::create([
        'publication_id' => createTestPublication($this->vendor, $this->category)->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHours(12),
    ]);

    ModerationCase::create([
        'publication_id' => createTestPublication($this->vendor, $this->category)->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->anotherModerator->id,
        'assigned_at' => now()->subHours(6),
    ]);

    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Nueva denuncia',
            'description' => 'Contenido inapropiado detectado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case = ModerationCase::latest('id')->first();
    expect($case->assigned_moderator_id)->toBe($lightModerator->id);
});

test('INC-002: la asignación automática ignora moderadores inactivos', function () {
    $inactiveModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => false,
    ]);

    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Reporte de prueba',
            'description' => 'Descripción del reporte',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case = ModerationCase::latest('id')->first();
    expect($case->assigned_moderator_id)->not->toBe($inactiveModerator->id);
    expect([$this->moderator->id, $this->anotherModerator->id])->toContain($case->assigned_moderator_id);
});

test('INC-003: reasigna automáticamente incidencias de moderador inactivo', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHours(2),
    ]);

    $this->moderator->update(['is_active' => false]);

    ReassignModeratorCasesJob::dispatchSync($this->moderator->id);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->anotherModerator->id);

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'reassign_case')
        ->latest('id')
        ->first();

    expect($action)->not->toBeNull();
    expect($action->metadata['original_moderator_id'])->toBe($this->moderator->id);
    expect($action->metadata['new_moderator_id'])->toBe($this->anotherModerator->id);
});



