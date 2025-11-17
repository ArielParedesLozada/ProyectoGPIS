<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

describe('Autorización y permisos', function () {
    beforeEach(function () {
        $this->category = Category::factory()->create();
        
        $this->moderator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'role' => RoleType::ADMIN->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        $this->vendor = User::factory()->create([
            'role' => RoleType::VENDEDOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);
    });

    it('MOD-AUTH-001: Moderador puede acceder a index', function () {
        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index'));

        $response->assertStatus(200);
    });

    it('MOD-AUTH-002: Admin puede acceder a index', function () {
        $response = $this->actingAs($this->admin)
            ->get(route('moderation.index'));

        $response->assertStatus(200);
    });

    it('MOD-AUTH-003: SuperAdmin NO puede acceder a index (checkModeratorPermissions bloquea)', function () {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('moderation.index'));

        $response->assertStatus(403);
    });

    it('MOD-AUTH-004: Vendedor NO puede acceder a index', function () {
        $response = $this->actingAs($this->vendor)
            ->get(route('moderation.index'));

        $response->assertStatus(403);
    });

    it('MOD-AUTH-005: Usuario no autenticado NO puede acceder a index', function () {
        $response = $this->get(route('moderation.index'));

        $response->assertRedirect(route('login'));
    });

    it('MOD-AUTH-006: Moderador puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(200);
    });

    it('MOD-AUTH-007: Admin puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(200);
    });

    it('MOD-AUTH-008: SuperAdmin NO puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(403);
    });

    it('MOD-AUTH-009: Vendedor NO puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);

        $response = $this->actingAs($this->vendor)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(403);
    });

    it('MOD-AUTH-010: Moderador puede acceder a getAppealStats', function () {
        $this->actingAs($this->moderator);
        $response = callModerationMethod('getAppealStats');
        
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
    });

    it('MOD-AUTH-011: Admin puede acceder a getAppealStats', function () {
        $this->actingAs($this->admin);
        $response = callModerationMethod('getAppealStats');
        
        expect($response)->not->toBeNull();
        $responseContent = $response->getContent();
        expect($responseContent)->not->toBeEmpty();
        
        expect($response->getStatusCode())->toBe(200);
        $responseData = json_decode($responseContent, true);
        expect($responseData)->not->toBeNull();
        expect($responseData)->toHaveKeys([
            'total_appeals',
            'pending_appeals',
            'reviewed_appeals',
            'overturned_appeals',
            'rejected_appeals',
            'appeals_by_month',
        ]);
    });

    it('MOD-AUTH-012: SuperAdmin NO puede acceder a getAppealStats', function () {
        $this->actingAs($this->superAdmin);
        $response = callModerationMethod('getAppealStats');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
    });

    it('MOD-AUTH-013: Vendedor NO puede acceder a getAppealStats', function () {
        $this->actingAs($this->vendor);
        $response = callModerationMethod('getAppealStats');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
    });
});

