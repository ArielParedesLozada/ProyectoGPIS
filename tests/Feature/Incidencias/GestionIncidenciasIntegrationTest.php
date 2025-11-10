<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ModerationReport;
use App\Models\Publication;
use App\Models\User;
use App\Jobs\ReassignModeratorCasesJob;
use App\Http\Controllers\ModerationController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Inertia\Testing\Inertia;

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

function createTestPublication(User $owner, Category $category, array $attributes = []): Publication
{
    return Publication::create(array_merge([
        'code' => (string) Str::uuid(),
        'title' => 'Publicación de prueba',
        'description' => 'Contenido descriptivo',
        'price' => 100,
        'location' => 'Centro, Ambato, Ecuador',
        'disponibility' => true,
        'category_id' => $category->id,
        'created_by' => $owner->id,
        'status' => StatusType::HABILITADO->value,
        'type' => 'producto',
        'published_at' => now(),
        'is_hidden' => false,
    ], $attributes));
}

function createModerationCase(Publication $publication, array $attributes = []): ModerationCase
{
    return ModerationCase::create(array_merge([
        'publication_id' => $publication->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => null,
        'assigned_at' => null,
        'resolved_at' => null,
    ], $attributes));
}

test('INT-012: crea incidencia automática cuando la publicación tiene contenido prohibido', function () {
    $payload = [
        'title' => 'Servicio de limpieza profesional',
        'description' => 'Ofrecemos trabajo sin palabras como puta ni contenido ofensivo',
        'price' => 45,
        'category_id' => $this->category->id,
        'type' => 'producto',
        'lat' => -1.24,
        'lng' => -78.52,
    ];

    $response = $this->actingAs($this->vendor)
        ->post(route('publications.store'), $payload);

    $response->assertRedirect(route('my-publications', absolute: false));

    $publication = Publication::first();
    expect($publication)->not->toBeNull();
    expect((bool) $publication->is_hidden)->toBeTrue();

    $case = ModerationCase::first();
    expect($case)->not->toBeNull();
    expect($case->status)->toBe('appealed');
    expect($case->source)->toBe('system');
    expect($case->assigned_moderator_id)->toBeNull();

    $action = ModerationAction::first();
    expect($action)->not->toBeNull();
    expect($action->metadata['auto_moderation'])->toBeTrue();
    expect($action->metadata['detected_words'])->toContain('puta');
});

test('INT-013: crea incidencia de reporte de usuario y la asigna automáticamente', function () {
    $publication = createTestPublication($this->vendor, $this->category);

    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Contenido inapropiado',
            'description' => 'Tiene información ofensiva',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case = ModerationCase::first();
    expect($case)->not->toBeNull();
    expect($case->publication_id)->toBe($publication->id);
    expect($case->status)->toBe('pending');
    expect($case->source)->toBe('user');
    expect($case->report_count)->toBe(1);
    expect($case->assigned_moderator_id)->not->toBeNull();
    expect([$this->moderator->id, $this->anotherModerator->id])->toContain($case->assigned_moderator_id);

    $report = ModerationReport::first();
    expect($report)->not->toBeNull();
    expect($report->moderation_case_id)->toBe($case->id);
    expect($report->reason)->toBe('Contenido inapropiado');
});

test('INT-014: consolida múltiples palabras prohibidas en una sola incidencia', function () {
    $payload = [
        'title' => 'Servicio premium',
        'description' => 'Este anuncio es una mierda cabron y puta con mucho contenido prohibido',
        'price' => 60,
        'category_id' => $this->category->id,
        'type' => 'producto',
        'lat' => -1.25,
        'lng' => -78.51,
    ];

    $response = $this->actingAs($this->vendor)
        ->post(route('publications.store'), $payload);

    $response->assertRedirect(route('my-publications', absolute: false));

    expect(ModerationCase::count())->toBe(1);

    $publication = Publication::first();
    expect((bool) $publication->is_hidden)->toBeTrue();

    $case = ModerationCase::first();
    expect($case->status)->toBe('appealed');

    $action = ModerationAction::first();
    expect($action)->not->toBeNull();
    expect($action->metadata['detected_words'])->toContain('cabron');
    expect($action->metadata['detected_words'])->toContain('mierda');
    expect($action->metadata['detected_words'])->toContain('puta');
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

test('INT-021: asigna incidencia al moderador con menor carga de trabajo', function () {
    $lightModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $heavyPublication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    ModerationCase::create([
        'publication_id' => $heavyPublication->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
    ]);

    ModerationCase::create([
        'publication_id' => createTestPublication($this->vendor, $this->category)->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHours(12),
    ]);

    ModerationCase::create([
        'publication_id' => createTestPublication($this->vendor, $this->category)->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->anotherModerator->id,
        'assigned_at' => now()->subHours(6),
    ]);

    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Nueva denuncia',
            'description' => 'Contenido inapropiado detectado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case = ModerationCase::latest('id')->first();
    expect($case->assigned_moderator_id)->toBe($lightModerator->id);
});

test('INT-022: la asignación automática ignora moderadores inactivos', function () {
    $inactiveModerator = User::factory()->create([
        'role' => RoleType::MODERADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => false,
    ]);

    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $reporter = User::factory()->create([
        'role' => RoleType::COMPRADOR->value,
        'status' => StatusType::HABILITADO->value,
        'is_active' => true,
    ]);

    $response = $this->actingAs($reporter)
        ->post(route('publication-report', $publication->id), [
            'reason' => 'Reporte de prueba',
            'description' => 'Descripción del reporte',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case = ModerationCase::latest('id')->first();
    expect($case->assigned_moderator_id)->not->toBe($inactiveModerator->id);
    expect([$this->moderator->id, $this->anotherModerator->id])->toContain($case->assigned_moderator_id);
});

test('INT-023: reasigna automáticamente incidencias de moderador inactivo', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = ModerationCase::create([
        'publication_id' => $publication->id,
        'status' => 'pending',
        'source' => 'user',
        'report_count' => 1,
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHours(2),
    ]);

    $this->moderator->update(['is_active' => false]);

    ReassignModeratorCasesJob::dispatchSync($this->moderator->id);

    $case->refresh();
    expect($case->assigned_moderator_id)->toBe($this->anotherModerator->id);

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'reassign_case')
        ->latest('id')
        ->first();

    expect($action)->not->toBeNull();
    expect($action->metadata['original_moderator_id'])->toBe($this->moderator->id);
    expect($action->metadata['new_moderator_id'])->toBe($this->anotherModerator->id);
});

test('INT-024: el moderador asignado puede resolver la incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Contenido prohibido detectado',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $case->refresh();
    $publication->refresh();

    expect($publication->is_hidden)->toBeTrue();
    expect($case->status)->toBe('action_taken');

    $action = ModerationAction::where('moderation_case_id', $case->id)
        ->where('action_type', 'hide_publication')
        ->first();

    expect($action)->not->toBeNull();
    expect($action->metadata['reason'])->toBe('Contenido prohibido detectado');
});

test('INT-025: solo el moderador asignado puede resolver la incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHour(),
    ]);

    $unauthorizedResponse = $this->actingAs($this->anotherModerator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Intento no autorizado',
        ]);

    $unauthorizedResponse->assertRedirect();
    $unauthorizedResponse->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->toBe('pending');

    $authorizedResponse = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Resolución válida',
        ]);

    $authorizedResponse->assertRedirect();
    $authorizedResponse->assertSessionHas('success');

    $case->refresh();
    expect($case->status)->toBe('action_taken');
});

test('INT-026: impide acciones sobre incidencias cerradas o descartadas', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => true]);
    $case = createModerationCase($publication, [
        'status' => 'closed',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
        'resolved_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'No debería permitirse',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);

    $case->refresh();
    expect($case->status)->toBe('closed');
});

test('INT-027: el historial registra todas las acciones sobre una incidencia', function () {
    $publication = createTestPublication($this->vendor, $this->category, ['is_hidden' => false]);
    $case = createModerationCase($publication, [
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subHours(3),
    ]);

    // Primera acción: ocultar por moderador original
    $this->actingAs($this->moderator)
        ->post(route('moderation.hide-publication', $case->id), [
            'reason' => 'Violación de políticas',
        ]);

    $case->refresh();
    $publication->refresh();
    expect($publication->is_hidden)->toBeTrue();

    // Preparar apelación y reasignar al segundo moderador
    $case->update([
        'status' => 'appealed',
        'assigned_moderator_id' => $this->anotherModerator->id,
        'assigned_at' => now(),
    ]);

    ModerationAction::create([
        'moderation_case_id' => $case->id,
        'moderator_id' => $this->anotherModerator->id,
        'action_type' => 'reassign_case',
        'action_description' => 'Caso asignado para revisión de apelación',
    ]);

    // Segunda acción: confirmar decisión final
    $this->actingAs($this->anotherModerator)
        ->post(route('moderation.confirm-hide-decision', $case->id), [
            'notes' => 'Se mantiene la decisión original',
        ]);

    $case->refresh();
    expect($case->status)->toBe('closed');

    $actions = ModerationAction::where('moderation_case_id', $case->id)
        ->orderBy('created_at')
        ->pluck('action_type')
        ->toArray();

    expect($actions)->toContain('hide_publication');
    expect($actions)->toContain('reassign_case');
    expect($actions)->toContain('close_case');
});

test('INT-028: el sistema entrega estadísticas correctas de incidencias', function () {
    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'in_review',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category, ['is_hidden' => true]), [
        'status' => 'appealed',
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'assigned_moderator_id' => null,
    ]);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index'));

    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->where('stats.total_cases', 4)
        ->where('stats.pending_cases', 2)
        ->where('stats.in_review_cases', 1)
        ->where('stats.appealed_cases', 1)
        ->where('stats.my_cases', 3)
        ->where('stats.unassigned_cases', 1)
    );
});

test('INT-029: permite listar y filtrar incidencias por estado y ordenar por fecha', function () {
    $recentCase = createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'created_at' => now(),
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'pending',
        'created_at' => now()->subDay(),
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDay(),
    ]);

    createModerationCase(createTestPublication($this->vendor, $this->category), [
        'status' => 'closed',
        'created_at' => now()->subDays(2),
        'resolved_at' => now()->subDay(),
        'assigned_moderator_id' => $this->moderator->id,
        'assigned_at' => now()->subDays(2),
    ]);

    $response = $this->actingAs($this->moderator)
        ->get(route('moderation.index', ['status' => 'pending']));

    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('moderation/index')
        ->has('cases.data', 2)
        ->where('cases.data.0.status', 'pending')
        ->where('cases.data.1.status', 'pending')
        ->where('cases.data', function ($cases) {
            $cases = $cases instanceof \Illuminate\Support\Collection ? $cases->toArray() : $cases;
            return $cases[0]['created_at'] >= $cases[1]['created_at'];
        })
    );
});


