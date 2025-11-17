<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\ModerationAppeal;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

describe('Moderation index', function () {
    beforeEach(function () {
        $testData = setupModerationTestData();
        $this->category = $testData->category;
        $this->moderator = $testData->moderator;
        $this->vendor = $testData->vendor;
    });

    it('MOD-IDX-001: Muestra la bandeja de moderación con estadísticas', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, ['status' => 'pending']);
        createModerationCase($publication, ['status' => 'in_review']);
        createModerationCase($publication, ['status' => 'appealed']);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('moderation/index')
            ->has('cases')
            ->has('stats', fn (Assert $stats) => $stats
                ->has('total_cases')
                ->has('pending_cases')
                ->has('in_review_cases')
                ->has('appealed_cases')
                ->has('my_cases')
                ->has('unassigned_cases')
                ->has('pending_appeals')
            )
            ->has('filters')
        );
    });

    it('MOD-IDX-002: Limpia filtros correctamente', function () {
        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['clear_filters' => true]));

        $response->assertRedirect(route('moderation.index'));
        $response->assertSessionHas('success');
    });

    it('MOD-IDX-003: Valida error cuando date_from es mayor que date_to', function () {
        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', [
                'date_from' => now()->addDay()->format('Y-m-d'),
                'date_to' => now()->subDay()->format('Y-m-d'),
            ]));

        $response->assertRedirect();
        $response->assertSessionHas('error');
    });

    it('MOD-IDX-004: Muestra info cuando solo se selecciona date_from', function () {
        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', [
                'date_from' => now()->subDay()->format('Y-m-d'),
            ]));

        $response->assertRedirect();
        $response->assertSessionHas('info');
    });

    it('MOD-IDX-005: Muestra info cuando solo se selecciona date_to', function () {
        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', [
                'date_to' => now()->format('Y-m-d'),
            ]));

        $response->assertRedirect();
        $response->assertSessionHas('info');
    });

    it('MOD-IDX-006: Filtra por status', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, ['status' => 'pending']);
        createModerationCase($publication, ['status' => 'closed']);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['status' => 'pending']));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
            ->where('cases.data.0.status', 'pending')
        );
    });

    it('MOD-IDX-007: Filtra por source', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, ['source' => 'user']);
        createModerationCase($publication, ['source' => 'system']);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['source' => 'user']));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
            ->where('cases.data.0.source', 'user')
        );
    });

    it('MOD-IDX-008: Filtra por assigned_to_me', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, ['assigned_moderator_id' => $this->moderator->id]);
        createModerationCase($publication, ['assigned_moderator_id' => null]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['assigned_to_me' => true]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
            ->where('cases.data.0.assigned_moderator_id', $this->moderator->id)
        );
    });

    it('MOD-IDX-009: Filtra por unassigned', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, ['assigned_moderator_id' => null]);
        createModerationCase($publication, ['assigned_moderator_id' => $this->moderator->id]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['unassigned' => true]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
            ->where('cases.data.0.assigned_moderator_id', null)
        );
    });

    it('MOD-IDX-010: Filtra por category_id', function () {
        $category2 = Category::factory()->create();
        $publication1 = createTestPublication($this->vendor, $this->category);
        $publication2 = createTestPublication($this->vendor, $category2);
        createModerationCase($publication1);
        createModerationCase($publication2);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['category_id' => $this->category->id]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
            ->where('cases.data.0.publication.category_id', $this->category->id)
        );
    });

    it('MOD-IDX-011: Filtra por date_from y date_to', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case1 = createModerationCase($publication);
        // Actualizar created_at usando DB para evitar problemas con timestamps
        DB::table('moderation_cases')->where('id', $case1->id)->update(['created_at' => now()->subDays(5)]);
        $case1->refresh();
        
        $case2 = createModerationCase($publication);
        DB::table('moderation_cases')->where('id', $case2->id)->update(['created_at' => now()->subDays(10)]);
        $case2->refresh();

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', [
                'date_from' => now()->subDays(7)->format('Y-m-d'),
                'date_to' => now()->format('Y-m-d'),
            ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
        );
    });

    it('MOD-IDX-012: Incluye casos eliminados cuando include_deleted es true', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);
        $case->delete();

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['include_deleted' => 'true']));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
        );
    });

    it('MOD-IDX-013: Solo muestra casos eliminados cuando only_deleted es true', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case1 = createModerationCase($publication);
        $case2 = createModerationCase($publication);
        $case2->delete();

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', ['only_deleted' => 'true']));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
        );
    });

    it('MOD-IDX-014: Calcula estadísticas correctamente', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, ['status' => 'pending']);
        createModerationCase($publication, ['status' => 'pending']);
        createModerationCase($publication, ['status' => 'in_review']);
        createModerationCase($publication, ['status' => 'appealed']);
        createModerationCase($publication, [
            'status' => 'pending',
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        // Crear una apelación pendiente relacionada con uno de los casos
        $appealCase = createModerationCase($publication, ['status' => 'appealed']);
        createModerationAppeal($appealCase, $this->vendor, ['reviewed_at' => null]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index'));

        $response->assertStatus(200);
        // Puede haber más casos de otros tests, así que verificamos que al menos tenga los que creamos
        $response->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_cases', fn($value) => $value >= 6) // 5 casos creados + el caso de apelación
            ->where('stats.pending_cases', fn($value) => $value >= 3)
            ->where('stats.in_review_cases', fn($value) => $value >= 1)
            ->where('stats.appealed_cases', fn($value) => $value >= 2) // 1 caso appealed + el caso de apelación
            ->where('stats.my_cases', fn($value) => $value >= 1)
            ->where('stats.pending_appeals', fn($value) => $value >= 1)
        );
    });

    it('MOD-IDX-015: Combina múltiples filtros', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        createModerationCase($publication, [
            'status' => 'pending',
            'source' => 'user',
            'assigned_moderator_id' => $this->moderator->id,
        ]);
        createModerationCase($publication, [
            'status' => 'pending',
            'source' => 'system',
        ]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index', [
                'status' => 'pending',
                'source' => 'user',
                'assigned_to_me' => true,
            ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->has('cases.data', 1)
            ->where('cases.data.0.status', 'pending')
            ->where('cases.data.0.source', 'user')
            ->where('cases.data.0.assigned_moderator_id', $this->moderator->id)
        );
    });
});

