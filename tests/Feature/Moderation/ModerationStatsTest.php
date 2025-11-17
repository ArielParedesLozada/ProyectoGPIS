<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

describe('Estadísticas de moderadores', function () {
    beforeEach(function () {
        $testData = setupModerationTestData();
        $this->category = $testData->category;
        $this->moderator = $testData->moderator;
        $this->anotherModerator = $testData->anotherModerator;
        $this->admin = $testData->admin;
        $this->superAdmin = $testData->superAdmin;
        $this->vendor = $testData->vendor;
    });

    it('MOD-MODSTAT-001: getActiveModeratorsStats retorna estadísticas de moderadores activos', function () {
        $inactiveModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::INHABILITADO->value,
            'is_active' => false,
        ]);

        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
            'status' => 'pending',
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getActiveModeratorsStats');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData)->toHaveKeys([
            'total_moderators',
            'active_moderators',
            'inactive_moderators',
            'moderators_with_cases',
        ]);
        // total_moderators incluye todos los moderadores y admins (moderator, anotherModerator, admin, inactiveModerator = 4)
        expect($responseData['total_moderators'])->toBe(4);
        expect($responseData['active_moderators'])->toBe(3); // moderator, anotherModerator, admin
        expect($responseData['inactive_moderators'])->toBe(1); // inactiveModerator
        expect($responseData['moderators_with_cases'])->toBe(1);
    });

    it('MOD-MODSTAT-002: handleModeratorReactivation retorna estadísticas de reactivación (solo admin o super_admin)', function () {
        $inactiveModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::INHABILITADO->value,
            'is_active' => false,
        ]);

        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);
        createModerationAction($case, $this->moderator, 'reassign_from_inactive_moderator', [
            'original_moderator_id' => $inactiveModerator->id,
        ]);

        $this->actingAs($this->admin);
        $response = callModerationMethod('handleModeratorReactivation', [$inactiveModerator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData['success'])->toBeTrue();
        expect($responseData['message'])->toBe('Moderador reactivado. Los casos reasignados permanecen con sus nuevos moderadores.');
        expect($responseData)->toHaveKeys(['stats', 'recommendations']);
        expect($responseData['stats'])->toHaveKeys([
            'moderator_name',
            'total_active_moderators',
            'cases_reassigned_while_inactive',
        ]);
        expect($responseData['stats']['cases_reassigned_while_inactive'])->toBe(1);
    });

    it('MOD-MODSTAT-003: handleModeratorReactivation requiere permisos de admin o super_admin', function () {
        $inactiveModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::INHABILITADO->value,
            'is_active' => false,
        ]);

        $this->actingAs($this->moderator);
        $response = callModerationMethod('handleModeratorReactivation', [$inactiveModerator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('No tienes permisos para realizar esta acción');
    });

    it('MOD-MODSTAT-004: handleModeratorReactivation valida que el usuario sea moderador', function () {
        $vendor = User::factory()->create([
            'role' => RoleType::VENDEDOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => false,
        ]);

        $this->actingAs($this->admin);
        $response = callModerationMethod('handleModeratorReactivation', [$vendor->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(400);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('El usuario no es un moderador');
    });

    it('MOD-MODSTAT-005: handleModeratorReactivation valida que el moderador no esté ya activo', function () {
        // Asegurar que el moderador esté activo antes de llamar al método
        $this->moderator->refresh();
        expect((int)$this->moderator->status)->toBe(StatusType::HABILITADO->value);
        expect($this->moderator->is_active)->toBeTrue();
        
        $this->actingAs($this->admin);
        $response = callModerationMethod('handleModeratorReactivation', [$this->moderator->id]);
        
        expect($response)->not->toBeNull();
        $responseContent = $response->getContent();
        expect($responseContent)->not->toBeEmpty();
        
        $responseData = json_decode($responseContent, true);
        expect($responseData)->not->toBeNull();
        expect($response->getStatusCode())->toBe(400);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('El moderador ya está activo');
    });
});

