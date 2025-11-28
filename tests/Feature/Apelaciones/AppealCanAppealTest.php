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

require_once __DIR__.'/appeal-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->category = Category::factory()->create();

    $this->owner = User::factory()->create([
        'role' => RoleType::VENDEDOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->otherUser = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->moderatorA = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);
});

test('APE-006: canAppeal retorna false si el usuario no es propietario', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    createModerationCaseForAppeal($publication, $this->moderatorA);

    $response = $this->actingAs($this->otherUser)
        ->getJson(route('publications.can-appeal', $publication->id));

    $response->assertStatus(200);
    $response->assertJson([
        'can_appeal' => false,
        'reason' => 'No tienes permisos para apelar esta publicación'
    ]);
});

test('APE-007: canAppeal retorna false si la publicación no está oculta', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category, [
        'is_hidden' => false,
    ]);
    createModerationCaseForAppeal($publication, $this->moderatorA);

    $response = $this->actingAs($this->owner)
        ->getJson(route('publications.can-appeal', $publication->id));

    $response->assertStatus(200);
    $response->assertJson([
        'can_appeal' => false,
        'reason' => 'Solo puedes apelar publicaciones que han sido ocultadas por moderación'
    ]);
});

test('APE-008: canAppeal retorna false si el caso está cerrado', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'closed',
    ]);

    $response = $this->actingAs($this->owner)
        ->getJson(route('publications.can-appeal', $publication->id));

    $response->assertStatus(200);
    $response->assertJson([
        'can_appeal' => false,
        'reason' => 'Este caso ya está cerrado. No se pueden enviar más apelaciones.'
    ]);
});

test('APE-009: canAppeal retorna true para casos de auto-moderación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'appealed',
        'source' => 'system',
        'report_count' => 0,
        'assigned_moderator_id' => null,
    ]);

    ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => null,
        'action_type' => 'hide_publication',
        'action_description' => 'Publicación ocultada automáticamente',
        'metadata' => [
            'auto_moderation' => true,
            'detected_words' => ['puta'],
        ],
    ]);

    $response = $this->actingAs($this->owner)
        ->getJson(route('publications.can-appeal', $publication->id));

    $response->assertStatus(200);
    $response->assertJson([
        'can_appeal' => true,
    ]);
});

test('APE-010: canAppeal retorna true para casos en estado appealed', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
    ]);

    $response = $this->actingAs($this->owner)
        ->getJson(route('publications.can-appeal', $publication->id));

    $response->assertStatus(200);
    $response->assertJson([
        'can_appeal' => true,
    ]);
});

test('APE-011: canAppeal retorna false si no existe caso de moderación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);

    $response = $this->actingAs($this->owner)
        ->getJson(route('publications.can-appeal', $publication->id));

    $response->assertStatus(200);
    $response->assertJson([
        'can_appeal' => false,
        'reason' => 'No se encontró un caso de moderación para esta publicación'
    ]);
});

test('APE-012: assignAppealToDifferentModerator asigna a moderador diferente cuando no hay moderador original', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'appealed',
        'source' => 'system',
        'report_count' => 0,
        'assigned_moderator_id' => null,
    ]);

    // Crear apelación que debería asignar a un moderador
    $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Apelación sin moderador original',
    ]);

    $case->refresh();
    expect($case->assigned_moderator_id)->not->toBeNull();
});

test('APE-013: handleNoModeratorsAvailable se ejecuta cuando no hay moderadores disponibles', function () {
    // Desactivar todos los moderadores
    $this->moderatorA->update(['is_active' => false]);

    // No crear más moderadores activos
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'action_taken',
        'assigned_moderator_id' => $this->moderatorA->id,
    ]);

    // Crear apelación - debería quedar sin asignar porque no hay moderadores activos
    $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Apelación sin moderadores disponibles',
    ]);

    $case->refresh();
    
    // Verificar que el caso quedó sin asignar
    expect($case->assigned_moderator_id)->toBeNull();
    
    // Verificar que se creó una acción de espera
    $waitingAction = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'waiting_assignment')
        ->first();

    expect($waitingAction)->not->toBeNull();
    expect($waitingAction->metadata['waiting_reason'])->toBe('no_moderators_available');
});

test('APE-014: canReopenCase retorna false para casos descartados', function () {
    require_once __DIR__.'/../Incidencias/incident-test-helpers.php';
    $publication = createTestPublication($this->owner, $this->category, ['is_hidden' => true]);
    $case = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'dismissed',
        'source' => 'user',
        'report_count' => 1,
        'resolved_at' => now()->subDays(10),
    ]);

    // Intentar reportar - no debería reabrir
    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Nuevo reporte',
            'description' => 'Intento de reabrir caso descartado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->toBe('dismissed');
});

test('APE-015: canReopenCase retorna false para casos cerrados hace más de 90 días', function () {
    require_once __DIR__.'/../Incidencias/incident-test-helpers.php';
    $publication = createTestPublication($this->owner, $this->category, ['is_hidden' => false]);
    $oldCase = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'closed',
        'source' => 'user',
        'report_count' => 1,
        'resolved_at' => now()->subDays(100),
    ]);

    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Reporte tardío',
            'description' => 'Después de 90 días',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Debería crear un nuevo caso, no reabrir el anterior
    $oldCase->refresh();
    expect($oldCase->status)->toBe('closed');
    
    $newCase = ModerationCase::where('id', '!=', $oldCase->id)
        ->where('publication_id', $publication->id)
        ->first();
    
    expect($newCase)->not->toBeNull();
    expect($newCase->status)->toBe('pending');
});

