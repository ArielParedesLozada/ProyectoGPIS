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

test('INT-024: el moderador asignado puede resolver la incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Contenido prohibido detectado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeTrue();
    expect($case->status)->toBe('action_taken');

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'hide_publication')
        ->first();

    expect($action)->not->toBeNull();
    expect($action->metadata['reason'])->toBe('Contenido prohibido detectado');
});

test('INT-025: solo el moderador asignado puede resolver la incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHour(),
    ]);

    $unauthorizedResponse = $this->actingAs($this->anotherModerator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Intento no autorizado',
        ]);

    $unauthorizedResponse->assertRedirect();
    $unauthorizedResponse->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->toBe('pending');

    $authorizedResponse = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Resolución válida',
        ]);

    $authorizedResponse->assertRedirect();
    $authorizedResponse->assertSessionHas('success');

    $case->refresh();
    expect($case->status)->toBe('action_taken');
});

test('INT-026: impide acciones sobre incidencias cerradas o descartadas', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'closed',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
        'resolved_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'No debería permitirse',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->toBe('closed');
});

test('INT-026B: el moderador puede descartar un caso', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'El caso no requiere acción',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($case->status)->toBe('dismissed');
    expect($case->resolution_notes)->toBe('El caso no requiere acción');
    expect($publication->is_hidden)->toBeFalse();

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'dismiss_case')
        ->first();

    expect($action)->not->toBeNull();
});

test('INT-026C: no se puede descartar un caso no asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'Intento no autorizado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->not->toBe('dismissed');
});

test('INT-026D: descartar un caso restaura la publicación si estaba oculta', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'El caso no requiere acción - publicación restaurada',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($case->status)->toBe('dismissed');
    expect($publication->is_hidden)->toBeFalse();

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'dismiss_case')
        ->first();

    expect($action)->not->toBeNull();
    expect($action->metadata['publication_restored'])->toBeTrue();
});

test('INT-026E: no se puede descartar un caso ya completado', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'status' => 'action_taken',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
        'resolved_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'Intento sobre caso completado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->toBe('action_taken');
});

