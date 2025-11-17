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

describe('Casos en espera', function () {
    beforeEach(function () {
        $testData = setupModerationTestData();
        $this->category = $testData->category;
        $this->moderator = $testData->moderator;
        $this->admin = $testData->admin;
        $this->superAdmin = $testData->superAdmin;
        $this->vendor = $testData->vendor;
    });

    it('MOD-WAIT-001: assignWaitingCasesToNewModerator asigna casos en espera a nuevo moderador', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case1 = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => null,
        ]);
        $case1->update(['created_at' => now()->subDays(2)]);

        $case2 = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => null,
        ]);
        $case2->update(['created_at' => now()->subDay()]);

        // Crear acciones de espera para los casos
        $action1 = createModerationAction($case1, null, 'waiting_for_moderator');
        $action2 = createModerationAction($case2, null, 'waiting_for_moderator');
        
        // Verificar que las acciones se crearon correctamente
        expect(ModerationAction::where('moderation_case_id', $case1->id)
            ->where('action_type', 'waiting_for_moderator')
            ->exists())->toBeTrue();
        expect(ModerationAction::where('moderation_case_id', $case2->id)
            ->where('action_type', 'waiting_for_moderator')
            ->exists())->toBeTrue();
        
        // Verificar que los casos tienen las acciones mediante la relación
        $case1->refresh();
        $case2->refresh();
        expect($case1->actions()->where('action_type', 'waiting_for_moderator')->exists())->toBeTrue();
        expect($case2->actions()->where('action_type', 'waiting_for_moderator')->exists())->toBeTrue();
        
        // Verificar que los casos cumplen las condiciones para ser encontrados
        expect($case1->assigned_moderator_id)->toBeNull();
        expect($case1->status)->toBe('appealed');
        expect($case2->assigned_moderator_id)->toBeNull();
        expect($case2->status)->toBe('appealed');

        // Verificar que la consulta whereHas encuentra los casos antes de llamar al método
        $casesBefore = ModerationCase::whereNull('assigned_moderator_id')
            ->where('status', 'appealed')
            ->whereHas('actions', function($query) {
                $query->where('action_type', 'waiting_for_moderator');
            })
            ->get();
        expect($casesBefore->count())->toBeGreaterThanOrEqual(2);

        // Verificar que el moderador cumple las condiciones antes de llamar al método
        $this->moderator->refresh();
        expect($this->moderator->role)->toBe('moderador');
        expect((int)$this->moderator->status)->toBe(StatusType::HABILITADO->value);
        expect($this->moderator->is_active)->toBeTrue();
        
        $this->actingAs($this->admin);
        $response = callModerationMethod('assignWaitingCasesToNewModerator', [$this->moderator->id]);
        
        expect($response)->not->toBeNull();
        $responseContent = $response->getContent();
        expect($responseContent)->not->toBeEmpty();
        
        $responseData = json_decode($responseContent, true);
        expect($responseData)->not->toBeNull();
        
        // Si hay un error, mostrar el mensaje para debugging
        if ($response->getStatusCode() !== 200) {
            dump('Error en assignWaitingCasesToNewModerator:', $responseData);
        }
        
        expect($response->getStatusCode())->toBe(200);
        expect($responseData['success'])->toBeTrue();
        // Puede haber más casos en espera de otros tests, así que verificamos que al menos se asignaron los 2 que creamos
        expect($responseData['assigned_count'])->toBeGreaterThanOrEqual(2);

        $case1->refresh();
        $case2->refresh();
        expect($case1->assigned_moderator_id)->toBe($this->moderator->id);
        expect($case2->assigned_moderator_id)->toBe($this->moderator->id);

        expect(ModerationAction::where('moderation_case_id', $case1->id)
            ->where('action_type', 'assigned_from_waiting')
            ->exists())->toBeTrue();
    });

    it('MOD-WAIT-002: assignWaitingCasesToNewModerator requiere permisos de admin o super_admin', function () {
        $this->actingAs($this->moderator);
        $response = callModerationMethod('assignWaitingCasesToNewModerator', [$this->moderator->id]);
        $responseData = json_decode($response->getContent(), true);
        
        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('No tienes permisos para realizar esta acción');
    });

    it('MOD-WAIT-003: assignWaitingCasesToNewModerator valida que el moderador sea activo y role moderador', function () {
        $inactiveModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::INHABILITADO->value,
            'is_active' => false,
        ]);

        $this->actingAs($this->admin);
        $response = callModerationMethod('assignWaitingCasesToNewModerator', [$inactiveModerator->id]);
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(400);
        expect($responseData['success'])->toBeFalse();
        expect($responseData['message'])->toBe('El usuario debe ser un moderador activo');
    });

    it('MOD-WAIT-004: getWaitingCases retorna casos en espera', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case1 = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => null,
        ]);
        $case2 = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => null,
        ]);

        createModerationAction($case1, null, 'waiting_for_moderator');
        createModerationAction($case2, null, 'waiting_for_moderator');

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getWaitingCases');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData)->toHaveCount(2);
    });

    it('MOD-WAIT-005: getWaitingCasesStats retorna estadísticas de casos en espera', function () {
        $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
        $case1 = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => null,
        ]);
        $case1->update(['created_at' => now()->subDays(5)]);

        $case2 = createModerationCase($publication, [
            'status' => 'appealed',
            'assigned_moderator_id' => null,
        ]);
        $case2->update(['created_at' => now()->subDay()]);

        createModerationAction($case1, null, 'waiting_for_moderator');
        createModerationAction($case2, null, 'waiting_for_moderator');

        $this->actingAs($this->moderator);
        $response = callModerationMethod('getWaitingCasesStats');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(200);
        expect($responseData)->toHaveKeys(['waiting_cases_count', 'active_moderators_count', 'oldest_waiting_case']);
        expect($responseData['waiting_cases_count'])->toBe(2);
        expect($responseData['active_moderators_count'])->toBeGreaterThanOrEqual(1); // Al menos 1 moderador activo
        expect($responseData['oldest_waiting_case']['id'])->toBe($case1->id);
    });
});

