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

test('APE-022: aceptar una apelación restaura la publicación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $appeal = ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Solicito restauración',
    ]);

    $response = $this->actingAs($this->moderatorB)->postJson(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'La apelación es válida',
        'final_decision' => 'overturn',
    ]);

    $response->assertStatus(200);
    $response->assertJson(['success' => true, 'decision' => 'overturn']);

    $case->refresh();
    $publication->refresh();
    $appeal->refresh();

    expect($publication->is_hidden)->toBeFalse();
    expect($case->status)->toBe('closed');
    expect($appeal->reviewed_at)->not->toBeNull();
    expect($appeal->reviewing_moderator_id)->toBe($this->moderatorB->id);

    expect(ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'appeal_overturned')
        ->exists())->toBeTrue();
});

test('APE-023: rechazar una apelación mantiene la decisión original', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $appeal = ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Solicito revisión',
    ]);

    $response = $this->actingAs($this->moderatorB)->postJson(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'Se mantiene la decisión original',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(200);
    $response->assertJson(['success' => true, 'decision' => 'uphold']);

    $case->refresh();
    $publication->refresh();
    $appeal->refresh();

    expect($publication->is_hidden)->toBeTrue();
    expect($case->status)->toBe('closed');
    expect($appeal->reviewed_at)->not->toBeNull();
    expect(ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'appeal_rejected')
        ->exists())->toBeTrue();
});

test('APE-024: solo el moderador asignado puede revisar la apelación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $appeal = ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Esperando revisión',
    ]);

    $response = $this->actingAs($this->moderatorA)->postJson(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'Intento no autorizado',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);

    $appeal->refresh();
    expect($appeal->reviewed_at)->toBeNull();
});

test('APE-025: no se puede revisar una apelación ya revisada', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $appeal = ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Apelación en curso',
        'review_notes' => 'Resuelta previamente',
        'reviewing_moderator_id' => $this->moderatorB->id,
        'reviewed_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($this->moderatorB)->postJson(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'Intento de segunda revisión',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

test('APE-026: valida que la apelación pertenezca al caso antes de resolver', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $otherCase = createModerationCaseForAppeal(createHiddenPublicationForAppeal($this->owner, $this->category), $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
    ]);

    $appealOther = ModerationAppeal::create([
        'moderation_case_id' => $otherCase->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Apelación de otro caso',
    ]);

    $response = $this->actingAs($this->moderatorB)->postJson(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appealOther->id,
        'review_notes' => 'Intento con apelación incorrecta',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

test('APE-027: el moderador puede restaurar una publicación desde una apelación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Solicito restauración',
    ]);

    $response = $this->actingAs($this->moderatorB)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeFalse();
    expect($case->status)->toBe('closed');
    expect($case->resolution_notes)->toBe('Publicación restaurada tras apelación');

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'restore_publication')
        ->first();

    expect($action)->not->toBeNull();
});

test('APE-028: no se puede restaurar publicación si no está asignada al moderador', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorA->id,
        'assigned_at' => now(),
    ]);

    $response = $this->actingAs($this->moderatorB)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $publication->refresh();
    expect($publication->is_hidden)->toBeTrue();
});

test('APE-029: no se puede restaurar publicación si el caso ya está completado', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'closed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now()->subDay(),
        'resolved_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->moderatorB)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $publication->refresh();
    expect($publication->is_hidden)->toBeTrue();
});

test('APE-030: no se puede restaurar publicación si no está en estado appealed', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'pending',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $response = $this->actingAs($this->moderatorB)
        ->post(route('moderation.restore-publication', $case->id));

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});

