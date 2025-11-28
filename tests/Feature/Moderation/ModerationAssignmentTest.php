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

test('MOD-032: Moderador puede asignarse un caso no asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.assign-to-me', $case->id));

    $response->assertStatus(200);
    $response->assertJson([
        'success' => true,
        'message' => 'Caso asignado correctamente',
    ]);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->moderator->id);
    expect($case->assigned_at)->not->toBeNull();
});

test('MOD-033: Moderador puede asignarse un caso ya asignado a él mismo', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.assign-to-me', $case->id));

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);
});

test('MOD-034: No puede asignarse un caso ya asignado a otro moderador', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.assign-to-me', $case->id));

    $response->assertStatus(400);
    $response->assertJson([
        'success' => false,
        'message' => 'Este caso ya está asignado a otro moderador',
    ]);
});

test('MOD-035: Puede asignarse un caso de apelación no asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => null,
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.assign-to-me', $case->id));

    $response->assertStatus(200);
    $response->assertJson([
        'success' => true,
        'message' => 'Caso asignado correctamente',
    ]);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->moderator->id);
});

test('MOD-036: assignAppealCase asigna caso de apelación no asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => null,
    ]);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('assignAppealCase', [$case->id]);
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(200);
    expect($responseData['success'])->toBeTrue();
    expect($responseData['message'])->toBe('Caso de apelación asignado correctamente');

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->moderator->id);
});

test('MOD-037: assignAppealCase rechaza caso que no es apelación', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, ['status' => 'pending']);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('assignAppealCase', [$case->id]);
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(400);
    expect($responseData['success'])->toBeFalse();
    expect($responseData['message'])->toBe('Este no es un caso de apelación');
});

test('MOD-038: assignAppealCase rechaza caso ya asignado', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('assignAppealCase', [$case->id]);
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(400);
    expect($responseData['success'])->toBeFalse();
    expect($responseData['message'])->toBe('Este caso ya está asignado a otro moderador');
});

test('MOD-039: getMyReportCases retorna solo casos de reportes asignados al moderador', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case1 = createModerationCase($publication, [
        'status' => 'pending',
        'assigned_moderator_id' => $this->moderator->id,
    ]);
    $case2 = createModerationCase($publication, [
        'status' => 'in_review',
        'assigned_moderator_id' => $this->moderator->id,
    ]);
    $case3 = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);
    createModerationCase($publication, [
        'status' => 'pending',
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('getMyReportCases');
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(200);
    expect($responseData)->toHaveCount(2);
    expect(collect($responseData)->pluck('id'))->not->toContain($case3->id); // No incluye apelaciones
});

test('MOD-040: getMyAppealCases retorna solo casos de apelaciones asignados al moderador', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case1 = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);
    $case2 = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);
    createModerationCase($publication, [
        'status' => 'pending',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('getMyAppealCases');
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(200);
    expect($responseData)->toHaveCount(2);
});

test('MOD-041: canAccessCase retorna false para apelación de propia decisión', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    createModerationAction($case, $this->moderator, 'hide_publication');

    $this->actingAs($this->moderator);
    $response = callModerationMethod('canAccessCase', [$case->id]);
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(200);
    expect($responseData['can_access'])->toBeFalse();
    expect($responseData['reason'])->toBe('No puedes revisar una apelación de tu propia decisión');
});

test('MOD-042: canAccessCase retorna false para caso no asignado al moderador', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->anotherModerator->id,
    ]);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('canAccessCase', [$case->id]);
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(200);
    expect($responseData['can_access'])->toBeFalse();
    expect($responseData['reason'])->toBe('Este caso no está asignado a ti');
});

test('MOD-043: canAccessCase retorna true para caso asignado correctamente', function () {
    $publication = createTestPublication($this->vendor, $this->category);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
    ]);

    $this->actingAs($this->moderator);
    $response = callModerationMethod('canAccessCase', [$case->id]);
    $responseData = json_decode($response->getContent(), true);

    expect($response->getStatusCode())->toBe(200);
    expect($responseData['can_access'])->toBeTrue();
});

