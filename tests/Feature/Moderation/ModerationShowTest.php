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
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    $testData = setupModerationTestData();
    $this->category = $testData->category;
    $this->moderator = $testData->moderator;
    $this->anotherModerator = $testData->anotherModerator;
    $this->vendor = $testData->vendor;
});

test('MOD-098: Muestra detalles del caso con relaciones cargadas', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('moderation/show')
            ->has('case')
            ->has('case.publication')
            ->has('case.publication.category')
            ->has('case.publication.user')
            ->has('buttonStates')
        );
    });

    test('MOD-099: getCaseButtonStates retorna estados correctos para caso pendiente asignado', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'pending',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['isAssignedToMe'])->toBeTrue();
        expect($responseData['isCompleted'])->toBeFalse();
        expect($responseData['isAppealed'])->toBeFalse();
        expect($responseData['isActionTaken'])->toBeFalse();
        expect($responseData['canHidePublication'])->toBeTrue();
        expect($responseData['canDismissCase'])->toBeTrue();
    });

    test('MOD-100: getCaseButtonStates retorna canHidePublication false si hay apelación pendiente', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'pending',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        createModerationAppeal($case, $this->vendor);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['canHidePublication'])->toBeFalse();
    });

    test('MOD-101: getCaseButtonStates retorna canRestorePublication true para apelación asignada a segundo moderador', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        createModerationAction($case, $this->anotherModerator, 'hide_publication');

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['canRestorePublication'])->toBeTrue();
        expect($responseData['canConfirmHideDecision'])->toBeTrue();
        expect($responseData['isOriginalModerator'])->toBeFalse();
    });

    test('MOD-102: getCaseButtonStates retorna isOriginalModerator true cuando el moderador actual es el original', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        createModerationAction($case, $this->moderator, 'hide_publication');

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['isOriginalModerator'])->toBeTrue();
        expect($responseData['canRestorePublication'])->toBeFalse();
        expect($responseData['canConfirmHideDecision'])->toBeFalse();
    });

    test('MOD-103: getCaseButtonStates retorna canDismissCase false para caso apelado', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['canDismissCase'])->toBeFalse();
        expect($responseData['isAppealed'])->toBeTrue();
    });

    test('MOD-104: getCaseButtonStates retorna isCompleted true para caso cerrado', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'closed',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['isCompleted'])->toBeTrue();
        expect($responseData['canHidePublication'])->toBeFalse();
        expect($responseData['canDismissCase'])->toBeFalse();
    });

    test('MOD-105: getCaseButtonStates retorna isAssignedToMe false cuando no está asignado', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => null,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['isAssignedToMe'])->toBeFalse();
        expect($responseData['canHidePublication'])->toBeFalse();
        expect($responseData['canDismissCase'])->toBeFalse();
    });

    test('MOD-106: getCaseButtonStates retorna canHidePublication false si publicación ya está oculta', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['canHidePublication'])->toBeFalse();
    });

    test('MOD-107: getCaseButtonStates retorna canHidePublication false si status es action_taken', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'status' => 'action_taken',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getCaseButtonStates', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['canHidePublication'])->toBeFalse();
    expect($responseData['isActionTaken'])->toBeTrue();
});

