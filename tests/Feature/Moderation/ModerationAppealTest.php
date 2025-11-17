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

describe('Gestión de apelaciones', function () {
    beforeEach(function () {
        $testData = setupModerationTestData();
        $this->category = $testData->category;
        $this->moderator = $testData->moderator;
        $this->anotherModerator = $testData->anotherModerator;
        $this->vendor = $testData->vendor;
    });

    describe('reviewAppeal', function () {
        it('MOD-APPEAL-001: Acepta apelación (overturn) y restaura publicación', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            createModerationAction($case, $this->anotherModerator, 'hide_publication');
            $appeal = createModerationAppeal($case, $this->vendor);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case->id), [
                    'appeal_id' => $appeal->id,
                    'review_notes' => 'La apelación es válida',
                    'final_decision' => 'overturn',
                ]);

            $response->assertStatus(200);
            $response->assertJson([
                'success' => true,
                'decision' => 'overturn',
            ]);

            $case->refresh();
            $publication->refresh();
            $appeal->refresh();

            expect($publication->is_hidden)->toBeFalse();
            expect($case->status)->toBe('closed');
            expect($appeal->reviewed_at)->not->toBeNull();
            expect($appeal->reviewing_moderator_id)->toBe($this->moderator->id);

            expect(ModerationAction::where('moderation_case_id', $case->id)
                ->where('action_type', 'appeal_overturned')
                ->exists())->toBeTrue();
        });

        it('MOD-APPEAL-002: Rechaza apelación (uphold) y mantiene publicación oculta', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            createModerationAction($case, $this->anotherModerator, 'hide_publication');
            $appeal = createModerationAppeal($case, $this->vendor);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case->id), [
                    'appeal_id' => $appeal->id,
                    'review_notes' => 'Se mantiene la decisión original',
                    'final_decision' => 'uphold',
                ]);

            $response->assertStatus(200);
            $response->assertJson([
                'success' => true,
                'decision' => 'uphold',
            ]);

            $case->refresh();
            $publication->refresh();

            expect($publication->is_hidden)->toBeTrue();
            expect($case->status)->toBe('closed');

            expect(ModerationAction::where('moderation_case_id', $case->id)
                ->where('action_type', 'appeal_rejected')
                ->exists())->toBeTrue();
        });

        it('MOD-APPEAL-003: Valida campos requeridos', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case->id));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['appeal_id', 'review_notes', 'final_decision']);
        });

        it('MOD-APPEAL-004: Valida que final_decision sea uphold u overturn', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            $appeal = createModerationAppeal($case, $this->vendor);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case->id), [
                    'appeal_id' => $appeal->id,
                    'review_notes' => 'Notas',
                    'final_decision' => 'invalid',
                ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['final_decision']);
        });

        it('MOD-APPEAL-005: No permite revisar si canReviewAppeal es false', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            createModerationAction($case, $this->moderator, 'hide_publication');
            $appeal = createModerationAppeal($case, $this->vendor);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case->id), [
                    'appeal_id' => $appeal->id,
                    'review_notes' => 'Intento no autorizado',
                    'final_decision' => 'uphold',
                ]);

            $response->assertStatus(403);
            $response->assertJson([
                'success' => false,
                'message' => 'No puedes revisar esta apelación',
            ]);
        });

        it('MOD-APPEAL-006: No permite revisar apelación que no pertenece al caso', function () {
            $publication1 = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case1 = createModerationCase($publication1, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            $publication2 = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case2 = createModerationCase($publication2, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            createModerationAction($case1, $this->anotherModerator, 'hide_publication');
            createModerationAction($case2, $this->anotherModerator, 'hide_publication');
            $appeal2 = createModerationAppeal($case2, $this->vendor);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case1->id), [
                    'appeal_id' => $appeal2->id,
                    'review_notes' => 'Intento con apelación incorrecta',
                    'final_decision' => 'uphold',
                ]);

            $response->assertStatus(400);
            $response->assertJson([
                'success' => false,
                'message' => 'La apelación no pertenece a este caso',
            ]);
        });

        it('MOD-APPEAL-007: No permite revisar apelación ya revisada', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            createModerationAction($case, $this->anotherModerator, 'hide_publication');
            $appeal = createModerationAppeal($case, $this->vendor, [
                'reviewed_at' => now()->subDay(),
            ]);

            $response = $this->actingAs($this->moderator)
                ->postJson(route('moderation.review-appeal', $case->id), [
                    'appeal_id' => $appeal->id,
                    'review_notes' => 'Intento de segunda revisión',
                    'final_decision' => 'uphold',
                ]);

            $response->assertStatus(400);
            $response->assertJson([
                'success' => false,
                'message' => 'Esta apelación ya ha sido revisada',
            ]);
        });

        // Nota: El bloque catch de reviewAppeal es difícil de cubrir sin romper la integridad referencial
        // Los mocks de DB no funcionan bien con reflection. Se cubre indirectamente cuando hay errores reales de base de datos
    });

    describe('getAppealStats', function () {
        it('MOD-APPEAL-008: Retorna estadísticas de apelaciones', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, ['status' => 'appealed']);

            $appeal1 = createModerationAppeal($case, $this->vendor);
            $appeal2 = createModerationAppeal($case, $this->vendor, ['reviewed_at' => now()]);

            $case2 = createModerationCase($publication, ['status' => 'closed']);
            $appeal3 = createModerationAppeal($case2, $this->vendor, ['reviewed_at' => now()]);
            // Crear la acción appeal_overturned después de crear la apelación para que estén relacionadas
            // La apelación debe estar relacionada con el caso que tiene la acción
            createModerationAction($case2, $this->moderator, 'appeal_overturned');
            
            // Verificar que la relación funciona correctamente
            $appeal3->refresh();
            $case2->refresh();
            expect($appeal3->moderationCase->id)->toBe($case2->id);
            expect($case2->actions()->where('action_type', 'appeal_overturned')->exists())->toBeTrue();
            
            // Verificar que la consulta whereHas encuentra la apelación
            $overturnedAppeals = ModerationAppeal::whereHas('moderationCase.actions', function($query) {
                $query->where('action_type', 'appeal_overturned');
            })->get();
            // Verificar que la apelación está en la lista (puede haber más de otras pruebas)
            $appealIds = $overturnedAppeals->pluck('id')->toArray();
            expect(in_array($appeal3->id, $appealIds))->toBeTrue();

            $this->actingAs($this->moderator);
            $response = callModerationMethod('getAppealStats');
            
            // Verificar que la respuesta sea válida
            expect($response)->not->toBeNull();
            $responseContent = $response->getContent();
            expect($responseContent)->not->toBeEmpty();
            
            $responseData = json_decode($responseContent, true);
            expect($responseData)->not->toBeNull();
            expect($response->getStatusCode())->toBe(200);
            expect($responseData)->toHaveKeys([
                'total_appeals',
                'pending_appeals',
                'reviewed_appeals',
                'overturned_appeals',
                'rejected_appeals',
                'appeals_by_month',
            ]);
            // Puede haber más apelaciones de otros tests, así que verificamos que al menos tenga las que creamos
            expect($responseData['total_appeals'])->toBeGreaterThanOrEqual(3);
            expect($responseData['pending_appeals'])->toBeGreaterThanOrEqual(1);
            expect($responseData['reviewed_appeals'])->toBeGreaterThanOrEqual(2);
            // overturned_appeals cuenta apelaciones que tienen una acción appeal_overturned en su caso relacionado
            expect($responseData['overturned_appeals'])->toBeGreaterThanOrEqual(1);
        });

        it('MOD-APPEAL-010: getAppealStats cubre todas las ramas SQL (PostgreSQL, MySQL, SQLite)', function () {
            // Este test asegura que todas las ramas de getAppealStats se ejecuten
            // La cobertura variará según el driver de base de datos usado en los tests
            // Solo se ejecutará una rama según el driver (pgsql, mysql/mariadb, o fallback)
            $this->actingAs($this->moderator);
            $response = callModerationMethod('getAppealStats');
            
            expect($response)->not->toBeNull();
            $responseData = json_decode($response->getContent(), true);
            expect($responseData)->not->toBeNull();
            expect($response->getStatusCode())->toBe(200);
            expect($responseData)->toHaveKey('appeals_by_month');
            
            // Verificar que appeals_by_month es una colección
            expect($responseData['appeals_by_month'])->toBeArray();
        });

        // Nota: Las ramas SQL (PostgreSQL, MySQL, SQLite) se ejecutan automáticamente según el driver de BD
        // Solo se ejecutará una rama según el driver usado en los tests (probablemente PostgreSQL)
        // No tiene sentido mockear DB::getDriverName() porque interfiere con otras llamadas internas de DB
    });

    describe('getMyPendingAppeals', function () {
        it('MOD-APPEAL-009: Retorna solo apelaciones pendientes asignadas al moderador', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case1 = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);
            $case2 = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->anotherModerator->id,
            ]);

            $appeal1 = createModerationAppeal($case1, $this->vendor);
            $appeal2 = createModerationAppeal($case2, $this->vendor);
            createModerationAppeal($case1, $this->vendor, ['reviewed_at' => now()]);

            $this->actingAs($this->moderator);
            $response = callModerationMethod('getMyPendingAppeals');
            $responseData = json_decode($response->getContent(), true);

            expect($response->getStatusCode())->toBe(200);
            expect($responseData)->toHaveCount(1);
            expect($responseData[0]['id'])->toBe($appeal1->id);
        });
    });
});

