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

describe('Acciones de moderación', function () {
    beforeEach(function () {
        $testData = setupModerationTestData();
        $this->category = $testData->category;
        $this->moderator = $testData->moderator;
        $this->anotherModerator = $testData->anotherModerator;
        $this->vendor = $testData->vendor;
    });

    describe('hidePublication', function () {
        it('MOD-HIDE-001: Oculta la publicación cuando el caso está asignado al moderador actual', function () {
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

        it('MOD-HIDE-002: Valida que reason sea requerido', function () {
            $publication = createTestPublication($this->vendor, $this->category);
            $case = createModerationCase($publication, [
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            $response = $this->actingAs($this->moderator)
                ->post(route('moderation.hide-publication', $case->id));

            $response->assertSessionHasErrors(['reason']);
        });

        it('MOD-HIDE-003: No permite ocultar si el caso no está asignado al moderador', function () {
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

        it('MOD-HIDE-004: No permite ocultar si el caso ya está completado', function () {
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

        it('MOD-HIDE-005: No permite ocultar si canHidePublication es false', function () {
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

        it('MOD-HIDE-006: No permite ocultar si hay apelación pendiente', function () {
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
    });

    describe('restorePublication', function () {
        it('MOD-REST-001: Restaura la publicación cuando está en apelación y asignada al segundo moderador', function () {
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

        it('MOD-REST-002: No permite restaurar si no está asignado al moderador', function () {
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

        it('MOD-REST-003: No permite restaurar si el caso ya está completado', function () {
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

        it('MOD-REST-004: No permite restaurar si canRestorePublication es false', function () {
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
    });

    describe('confirmHideDecision', function () {
        it('MOD-CONF-001: Confirma decisión de ocultar cuando está en apelación', function () {
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

        it('MOD-CONF-002: Valida que notes sea requerido', function () {
            $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
            $case = createModerationCase($publication, [
                'status' => 'appealed',
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            $response = $this->actingAs($this->moderator)
                ->post(route('moderation.confirm-hide-decision', $case->id));

            $response->assertSessionHasErrors(['notes']);
        });

        it('MOD-CONF-003: Valida mensajes personalizados de validación', function () {
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

        it('MOD-CONF-004: No permite confirmar si no está asignado al moderador', function () {
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

        it('MOD-CONF-005: No permite confirmar si el caso no está en estado appealed', function () {
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
    });

    describe('dismissCase', function () {
        it('MOD-DISM-001: Descarta caso correctamente cuando publicación no está oculta', function () {
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

        it('MOD-DISM-002: Descarta caso y restaura publicación si estaba oculta', function () {
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

        it('MOD-DISM-003: Valida que notes sea requerido', function () {
            $publication = createTestPublication($this->vendor, $this->category);
            $case = createModerationCase($publication, [
                'assigned_moderator_id' => $this->moderator->id,
            ]);

            $response = $this->actingAs($this->moderator)
                ->post(route('moderation.dismiss', $case->id));

            $response->assertSessionHasErrors(['notes']);
        });

        it('MOD-DISM-004: No permite descartar si no está asignado al moderador', function () {
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

        it('MOD-DISM-005: No permite descartar si el caso ya está completado', function () {
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

        it('MOD-DISM-006: No permite descartar si canDismissCase es false', function () {
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
    });

    // Nota: Los bloques catch son difíciles de cubrir sin romper la integridad referencial
    // Los mocks de DB no funcionan bien con reflection. Se cubren indirectamente cuando hay errores reales de base de datos
});


