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
use Illuminate\Support\Facades\Artisan;

require_once __DIR__.'/appeal-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->category = Category::factory()->create();

    $this->owner = User::factory()->create([
        'role' => RoleType::VENDEDOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->moderatorA = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->moderatorB = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);
});

test('APE-001: la apelación se asigna automáticamente a un moderador diferente', function () {
    $extraModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA);

    $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Solicito revisión por otro moderador',
    ]);

    $case->refresh();
    expect($case->status)->toBe('appealed');
    expect($case->assigned_moderator_id)->toBe($this->moderatorB->id);
    expect($case->assigned_moderator_id)->not->toBe($this->moderatorA->id);
});

test('APE-002: el moderador puede asignarse manualmente una apelación disponible', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => null,
        'assigned_at' => null,
    ]);

    $appeal = ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Apelación pendiente',
    ]);

    // Moderador B se asigna la apelación
    $assignResponse = $this->actingAs($this->moderatorB)
        ->post(route('moderation.assign-to-me', $case->id));

    $assignResponse->assertStatus(200);
    $assignResponse->assertJson(['success' => true]);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->moderatorB->id);

    // Un tercer moderador intenta asignarse el mismo caso
    $thirdModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $secondAttempt = $this->actingAs($thirdModerator)
        ->post(route('moderation.assign-to-me', $case->id));

    $secondAttempt->assertStatus(400);
    $secondAttempt->assertJson(['success' => false]);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->moderatorB->id);
});

test('APE-003: el sistema impide reasignar la apelación al moderador original', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => null,
        'assigned_at' => null,
    ]);

    ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Apelación pendiente',
    ]);

    $response = $this->actingAs($this->moderatorA)
        ->post(route('moderation.assign-to-me', $case->id));

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBeNull();
});

test('APE-004: apelaciones pendientes se asignan a moderadores recién activados', function () {
    $inactiveModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => false,
    ]);

    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => null,
        'assigned_at' => null,
    ]);

    ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Esperando moderador',
    ]);

    ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => null,
        'action_type' => 'close_case',
        'action_description' => 'Apelación en espera de asignación automática',
        'metadata' => [
            'waiting_for_moderator' => true,
        ],
    ]);

    Artisan::call('moderation:assign-pending-appeals');
    $case->refresh();
    expect($case->assigned_moderator_id)->toBeNull();

    $inactiveModerator->update(['is_active' => true]);
    Artisan::call('moderation:assign-pending-appeals');

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($inactiveModerator->id);
});

test('APE-005: la asignación automática solo considera moderadores activos y habilitados', function () {
    $inactiveModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => false,
    ]);

    $disabledModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::INHABILITADO->value,
        'is_active' => true,
    ]);

    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA);

    $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Validar asignación solo a activos',
    ]);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->moderatorB->id);
    expect($case->assigned_moderator_id)->not->toBe($inactiveModerator->id);
    expect($case->assigned_moderator_id)->not->toBe($disabledModerator->id);
});



