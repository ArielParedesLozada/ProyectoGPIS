<?php

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

require_once __DIR__.'/moderation-test-helpers.php';

uses(RefreshDatabase::class);

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

test('MOD-074: Moderador puede acceder a index', function () {
        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.index'));

        $response->assertStatus(200);
    });

    test('MOD-075: Admin puede acceder a index', function () {
        $response = $this->actingAs($this->admin)
            ->get(route('moderation.index'));

        $response->assertStatus(200);
    });

    test('MOD-076: SuperAdmin NO puede acceder a index', function () {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('moderation.index'));

        $response->assertStatus(403);
    });

    test('MOD-077: Vendedor NO puede acceder a index', function () {
        $response = $this->actingAs($this->vendor)
            ->get(route('moderation.index'));

        $response->assertStatus(403);
    });

    test('MOD-078: Usuario no autenticado NO puede acceder a index', function () {
        $response = $this->get(route('moderation.index'));

        $response->assertRedirect(route('login'));
    });

    test('MOD-079: Moderador puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->moderator->id,
        ]);

        $response = $this->actingAs($this->moderator)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(200);
    });

    test('MOD-080: Admin puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication, [
            'assigned_moderator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(200);
    });

    test('MOD-081: SuperAdmin NO puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(403);
    });

    test('MOD-082: Vendedor NO puede acceder a show', function () {
        $publication = createTestPublication($this->vendor, $this->category);
        $case = createModerationCase($publication);

        $response = $this->actingAs($this->vendor)
            ->get(route('moderation.show', $case->id));

        $response->assertStatus(403);
    });

    test('MOD-083: Moderador puede acceder a getAppealStats', function () {
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

    test('MOD-084: Admin puede acceder a getAppealStats', function () {
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

    test('MOD-085: SuperAdmin NO puede acceder a getAppealStats', function () {
        $this->actingAs($this->superAdmin);
        $response = callModerationMethod('getAppealStats');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
        expect($responseData['success'])->toBeFalse();
    });

    test('MOD-086: Vendedor NO puede acceder a getAppealStats', function () {
        $this->actingAs($this->vendor);
        $response = callModerationMethod('getAppealStats');
        $responseData = json_decode($response->getContent(), true);

        expect($response->getStatusCode())->toBe(403);
    expect($responseData['success'])->toBeFalse();
});

