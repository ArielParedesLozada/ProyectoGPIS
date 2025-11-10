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
use Illuminate\Support\Str;

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

function createHiddenPublicationForAppeal(User $owner, Category $category, array $attributes = []): Publication
{
    return Publication::create(array_merge([
        'code' => (string) Str::uuid(),
        'title' => 'Servicio suspendido',
        'description' => 'Contenido moderado',
        'price' => 120,
        'location' => 'Centro, Quito, Ecuador',
        'disponibility' => true,
        'category_id' => $category->id,
        'created_by' => $owner->id,
        'status' => StatusType::HABILITADO->value,
        'type' => 'producto',
        'published_at' => now()->subDay(),
        'is_hidden' => true,
    ], $attributes));
}

function createModerationCaseForAppeal(Publication $publication, User $originalModerator, array $attributes = []): ModerationCase
{
    $case = ModerationCase::create(array_merge([
        'publication_id' => $publication->id,
        'status' => 'action_taken',
        'source' => 'user_report',
        'report_count' => 1,
        'assigned_moderator_id' => $originalModerator->id,
        'assigned_at' => now()->subHours(2),
        'resolved_at' => now()->subHour(),
    ], $attributes));

    ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => $originalModerator->id,
        'action_type' => 'hide_publication',
        'action_description' => 'Publicación ocultada por moderación',
        'metadata' => [
            'reason' => 'Contenido inapropiado',
        ],
    ]);

    return $case;
}

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

test('INT-035: la apelación se asigna automáticamente a un moderador diferente', function () {
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

test('INT-036: el moderador puede asignarse manualmente una apelación disponible', function () {
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

test('INT-037: el sistema impide reasignar la apelación al moderador original', function () {
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

test('INT-038: apelaciones pendientes se asignan a moderadores recién activados', function () {
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

test('INT-039: la asignación automática solo considera moderadores activos y habilitados', function () {
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

test('INT-040: aceptar una apelación restaura la publicación', function () {
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

    $response = $this->actingAs($this->moderatorB)->post(route('moderation.review-appeal', $case->id), [
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

test('INT-041: rechazar una apelación mantiene la decisión original', function () {
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

    $response = $this->actingAs($this->moderatorB)->post(route('moderation.review-appeal', $case->id), [
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

test('INT-042: solo el moderador asignado puede revisar la apelación', function () {
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

    $response = $this->actingAs($this->moderatorA)->post(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'Intento no autorizado',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);

    $appeal->refresh();
    expect($appeal->reviewed_at)->toBeNull();
});

test('INT-043: no se puede revisar una apelación ya revisada', function () {
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

    $response = $this->actingAs($this->moderatorB)->post(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'Intento de segunda revisión',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

test('INT-044: valida que la apelación pertenezca al caso antes de resolver', function () {
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

    $response = $this->actingAs($this->moderatorB)->post(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appealOther->id,
        'review_notes' => 'Intento con apelación incorrecta',
        'final_decision' => 'uphold',
    ]);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

test('INT-045: el historial registra cada acción sobre la apelación', function () {
    $publication = createHiddenPublicationForAppeal($this->owner, $this->category);
    $case = createModerationCaseForAppeal($publication, $this->moderatorA, [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderatorB->id,
        'assigned_at' => now(),
    ]);

    $appeal = ModerationAppeal::create([
        'moderation_case_id' => $case->id,
        'appealer_id' => $this->owner->id,
        'appeal_reason' => 'Apelación para historial',
    ]);

    $this->actingAs($this->moderatorB)->post(route('moderation.review-appeal', $case->id), [
        'appeal_id' => $appeal->id,
        'review_notes' => 'Se mantiene decisión',
        'final_decision' => 'uphold',
    ]);

    $actions = ModerationAction::where('moderation_case_id', $case->id)
        ->orderBy('created_at')
        ->pluck('action_type')
        ->toArray();

    expect($actions)->toContain('hide_publication');
    expect($actions)->toContain('appeal_rejected');
});


