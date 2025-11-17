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



