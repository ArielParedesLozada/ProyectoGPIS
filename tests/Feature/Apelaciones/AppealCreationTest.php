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

    $this->moderatorB = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);
});

test('INT-030: crea apelación y actualiza estado del caso', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA);

    $response = $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Considero que la decisión fue injusta',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeTrue();
    expect($case->status)->toBe('appealed');
    expect($case->assigned_moderator_id)->not->toBeNull();
    expect($case->assigned_moderator_id)->not->toBe($this->moderatorA->id);

    $appeal = ModerationAppeal::first();
    expect($appeal)->not->toBeNull();
    expect($appeal->moderation_case_id)->toBe($case->id);
    expect($appeal->appeal_reason)->toBe('Considero que la decisión fue injusta');
});

test('INT-031: solo el creador puede presentar apelación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA);

    $response = $this->actingAs($this->otherUser)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Intento de apelación no autorizado',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect(ModerationAppeal::count())->toBe(0);

    // Verificación de que el propietario sí puede apelar después del rechazo
    $successResponse = $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Apelación válida por el propietario',
    ]);

    $successResponse->assertRedirect();
    $successResponse->assertSessionHas('success');
    expect(ModerationAppeal::count())->toBe(1);
});

test('INT-032: solo se pueden apelar publicaciones ocultas', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category, [
        'is_hidden' => false,
    ]);
    createModerationCaseForAppeal($publication, $this->moderatorA);

    $response = $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Intento de apelar publicación visible',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect(ModerationAppeal::count())->toBe(0);
});

test('INT-033: evita múltiples apelaciones pendientes para el mismo caso', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Apelación pendiente existente',
    ]);

    $response = $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Intento de duplicado',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect(ModerationAppeal::where('moderation_case_id', $case->id)->count())->toBe(1);
});

test('INT-034: no se pueden apelar casos cerrados', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'closed',
    ]);

    $response = $this->actingAs($this->owner)->post(route('publications.appeal', $publication->id), [
        'reason' => 'Intento sobre caso cerrado',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
    expect(ModerationAppeal::where('moderation_case_id', $case->id)->count())->toBe(0);
});



