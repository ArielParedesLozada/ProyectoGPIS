<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    $testData = setupModerationTestData();
    $this->category = $testData->category;
    $this->moderator = $testData->moderator;
    $this->anotherModerator = $testData->anotherModerator;
    $this->vendor = $testData->vendor;
});

test('MOD-001: Oculta publicación cuando está asignada', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Contenido inapropiado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeTrue();
    expect($case->status)->toBe('action_taken');
    expect($case->resolution_notes)->toBe('Contenido inapropiado');
    expect($case->resolved_at)->not->toBeNull();

    expect(ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'hide_publication')
        ->exists())->toBeTrue();
});

test('MOD-002: Valida que reason sea requerido', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id));

    $response->assertSessionHasErrors(['reason']);
});

test('MOD-003: No permite ocultar si no está asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Intento no autorizado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-004: No permite ocultar si el caso está completado', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'status' => 'closed',
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Intento sobre caso cerrado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-005: No permite ocultar si canHidePublication es false', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Intento sobre publicación ya oculta',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-006: No permite ocultar si hay apelación pendiente', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    createModerationAppeal($case, $this->vendor);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Intento con apelación pendiente',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-007: Restaura publicación en apelación', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    createModerationAction($case, $this->anotherModerator, 'hide_publication');

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeFalse();
    expect($case->status)->toBe('closed');
    expect($case->resolution_notes)->toBe('Publicación restaurada tras apelación');

    expect(ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'restore_publication')
        ->exists())->toBeTrue();
});

test('MOD-008: No permite restaurar si no está asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-009: No permite restaurar si el caso está completado', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'closed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-010: No permite restaurar si canRestorePublication es false', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-011: Confirma decisión de ocultar en apelación', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    createModerationAction($case, $this->anotherModerator, 'hide_publication');

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.confirm-hide-decision', $case->id), [
            'notes' => 'Se confirma la decisión original',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeTrue();
    expect($case->status)->toBe('closed');
    expect($case->resolution_notes)->toBe('Se confirma la decisión original');

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'close_case')
        ->first();

    expect($action)->not->toBeNull();
    expect($action->metadata['action_subtype'])->toBe('confirm_hide_decision');
});

test('MOD-012: Valida que notes sea requerido', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.confirm-hide-decision', $case->id));

    $response->assertSessionHasErrors(['notes']);
});

test('MOD-013: Valida mensajes personalizados de validación', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.confirm-hide-decision', $case->id), [
            'notes' => str_repeat('a', 1001),
        ]);

    $response->assertSessionHasErrors(['notes']);
});

test('MOD-014: No permite confirmar si no está asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.confirm-hide-decision', $case->id), [
            'notes' => 'Intento no autorizado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-015: No permite confirmar si no está en estado appealed', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'pending',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.confirm-hide-decision', $case->id), [
            'notes' => 'Intento sobre caso no apelado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-016: Descarta caso cuando publicación no está oculta', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
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
    expect($action->metadata['publication_restored'])->toBeFalse();
});

test('MOD-017: Descarta caso y restaura publicación oculta', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'Caso descartado - publicación restaurada',
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

test('MOD-018: Valida que notes sea requerido para descartar', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id));

    $response->assertSessionHasErrors(['notes']);
});

test('MOD-019: No permite descartar si no está asignado', function () {
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
});

test('MOD-020: No permite descartar si el caso está completado', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'status' => 'closed',
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'Intento sobre caso cerrado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

test('MOD-021: No permite descartar si canDismissCase es false', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'status' => 'appealed',
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.dismiss', $case->id), [
            'notes' => 'Intento sobre caso apelado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

// Nota: Los bloques catch son difíciles de cubrir sin romper la integridad referencial
// Los mocks de DB no funcionan bien con reflection. Se cubren indirectamente cuando hay errores reales de base de datos


