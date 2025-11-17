<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

describe('Verificación de capacidad de realizar acciones', function () {
    beforeEach(function () {
        $testData = setupModerationTestData();
        $this->category = $testData->category;
        $this->moderator = $testData->moderator;
        $this->anotherModerator = $testData->anotherModerator;
        $this->vendor = $testData->vendor;
    });

    it('MOD-ACCESS-001: canPerformActions retorna false cuando el caso no está asignado al moderador', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->anotherModerator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('canPerformActions', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['can_perform_actions'])->toBeFalse();
        expect($responseData['is_assigned_to_me'])->toBeFalse();
        expect($responseData['is_completed'])->toBeFalse();
        expect(str_contains($responseData['message'], 'asignado a'))->toBeTrue();
    });

    it('MOD-ACCESS-002: canPerformActions retorna false cuando el caso ya está completado', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
            'status' => 'closed',
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('canPerformActions', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['can_perform_actions'])->toBeFalse();
        expect($responseData['is_assigned_to_me'])->toBeTrue();
        expect($responseData['is_completed'])->toBeTrue();
        expect(str_contains($responseData['message'], 'completado'))->toBeTrue();
    });

    it('MOD-ACCESS-003: canPerformActions retorna mensaje específico para caso apelado', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
            'status' => 'appealed',
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('canPerformActions', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['can_perform_actions'])->toBeTrue();
        expect($responseData['is_appealed'])->toBeTrue();
        expect(str_contains($responseData['message'], 'apelado'))->toBeTrue();
    });

    it('MOD-ACCESS-004: canPerformActions retorna true cuando el moderador puede realizar acciones', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
            'status' => 'pending',
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('canPerformActions', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['can_perform_actions'])->toBeTrue();
        expect($responseData['is_assigned_to_me'])->toBeTrue();
        expect($responseData['is_completed'])->toBeFalse();
        expect(str_contains($responseData['message'], 'Puedes realizar acciones'))->toBeTrue();
    });

    it('MOD-ACCESS-005: canPerformActions incluye información del caso y usuario', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('canPerformActions', [$case->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData)->toHaveKeys([
            'can_perform_actions',
            'is_assigned_to_me',
            'is_completed',
            'is_appealed',
            'case_status',
            'assigned_to',
            'current_user',
            'message',
        ]);
        expect($responseData['case_status'])->toBe('pending');
        expect($responseData['assigned_to'])->toBe($this->moderator->name . ' ' . $this->moderator->surname);
    });
});

