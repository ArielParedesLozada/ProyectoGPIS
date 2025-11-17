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



