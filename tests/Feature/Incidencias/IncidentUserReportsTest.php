<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ModerationReport;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/incident-test-helpers.php';

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    Http::fake([
        'nominatim.openstreetmap.org/*' => Http::response([
            'address' => [
                'suburb' => 'Centro',
                'city' => 'Ambato',
                'country' => 'Ecuador',
            ],
        ]),
    ]);

    $this->vendor = User::factory()->create([
        'role' => RoleType::VENDEDOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->moderator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->anotherModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $this->category = Category::factory()->create();
});

test('INT-015: bloquea reportes repetidos dentro de 60 minutos', function () {
    $publication = createTestPublication($this->vendor, $this->category);

    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $firstResponse = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Contenido ofensivo',
            'description' => 'Tiene palabras prohibidas',
        ]);

    $firstResponse->assertRedirect();
    $firstResponse->assertSessionHas('success');

    $secondResponse = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Reitero el reporte',
            'description' => 'Sigue siendo ofensivo',
        ]);

    $secondResponse->assertRedirect();
    $secondResponse->assertSessionHasErrors(['error']);

    expect(ModerationCase::count())->toBe(1);
    $case = ModerationCase::first();
    $case->refresh();
    expect($case->report_count)->toBe(1);
    expect(ModerationReport::count())->toBe(1);
});

test('INT-016: impide que el creador reporte su propia publicación', function () {
    $publication = createTestPublication($this->vendor, $this->category);

    $response = $this->actingAs($this->vendor)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Auto-reporte',
            'description' => 'Probando auto reporte',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    expect(ModerationCase::count())->toBe(0);
    expect(ModerationReport::count())->toBe(0);
});

test('INT-017: agrega reportes de distintos usuarios a la misma incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category);

    $reporterA = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $reporterB = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $firstResponse = $this->actingAs($reporterA)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Spam',
            'description' => 'Publicación irrelevante',
        ]);

    $firstResponse->assertRedirect();
    $firstResponse->assertSessionHas('success');

    $case = ModerationCase::first();
    expect($case)->not->toBeNull();
    expect($case->report_count)->toBe(1);

    $secondResponse = $this->actingAs($reporterB)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Más spam',
            'description' => 'Confirma el problema',
        ]);

    $secondResponse->assertRedirect();
    $secondResponse->assertSessionHas('success');

    $case->refresh();
    expect(ModerationCase::count())->toBe(1);
    expect($case->report_count)->toBe(2);
    expect(ModerationReport::count())->toBe(2);
    expect(ModerationReport::where('moderation_case_id', $case->id)->count())->toBe(2);
});

test('INT-018: reabre incidencia cerrada hace menos de 90 días con nuevo reporte', function () {
    $publication = createTestPublication($this->vendor, $this->category, [
        'is_hidden' => true,
    ]);

    $closedCase = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'closed',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDays(20),
        'resolved_at' => now()->subDays(10),
    ]);

    ModerationAction::create([
        'moderation_case_id' => $closedCase->id,
        'moderator_id' => $this->moderator->id,
        'action_type' => 'close_case',
        'action_description' => 'Caso cerrado tras revisión',
        'metadata' => ['previous_status' => 'action_taken'],
    ]);

    ModerationReport::create([
        'moderation_case_id' => $closedCase->id,
        'reporter_id' => User::factory()->create()->id,
        'reason' => 'Contenido ofensivo',
        'description' => 'Primer reporte',
    ]);

    $newReporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($newReporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Nuevo reporte',
            'description' => 'Siguen los problemas',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect(ModerationCase::count())->toBe(1);

    $closedCase->refresh();
    expect($closedCase->status)->toBe('pending');
    expect($closedCase->assigned_moderator_id)->not->toBeNull();
    expect([$this->moderator->id, $this->anotherModerator->id])->toContain($closedCase->assigned_moderator_id);
    expect($closedCase->report_count)->toBe(2);
    expect($closedCase->resolved_at)->toBeNull();

    expect(ModerationAction::where('moderation_case_id', $closedCase->id)
        ->where('action_type', 'reopen_case')
        ->exists())->toBeTrue();

    expect(ModerationReport::where('moderation_case_id', $closedCase->id)->count())->toBe(2);
});

test('INT-019: mantiene incidencia descartada sin generar nuevos casos', function () {
    $publication = createTestPublication($this->vendor, $this->category, [
        'is_hidden' => false,
    ]);

    $dismissedCase = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'dismissed',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDays(5),
        'resolved_at' => now()->subDays(2),
    ]);

    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Quiero reabrir',
            'description' => 'Nueva información',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    expect(ModerationCase::count())->toBe(1);
    $dismissedCase->refresh();
    expect($dismissedCase->status)->toBe('dismissed');
    expect(ModerationReport::count())->toBe(0);
});

test('INT-020: crea nueva incidencia si el caso anterior está cerrado hace más de 90 días', function () {
    $publication = createTestPublication($this->vendor, $this->category, [
        'is_hidden' => false,
    ]);

    ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'closed',
        'source' => 'user',
        'report_count' => 2,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDays(120),
        'resolved_at' => now()->subDays(100),
    ]);

    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Reporte tardío',
            'description' => 'Nuevo incidente',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect(ModerationCase::count())->toBe(2);

    $latestCase = ModerationCase::latest('id')->first();
    expect($latestCase->status)->toBe('pending');
    expect($latestCase->report_count)->toBe(1);
    expect($latestCase->assigned_moderator_id)->not->toBeNull();
    expect([$this->moderator->id, $this->anotherModerator->id])->toContain($latestCase->assigned_moderator_id);
});



