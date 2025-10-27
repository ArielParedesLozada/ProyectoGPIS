<?php

namespace Tests\Feature\Appeals;

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\Publication;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class MultipleAppealsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $moderatorA;
    protected User $moderatorB;
    protected Category $category;
    protected Publication $publication;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear usuarios
        $this->user = User::factory()->create([
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

        // Crear categoría y publicación
        $this->category = Category::factory()->create();
        $this->publication = Publication::factory()->create([
            'created_by' => $this->user->id,
            'category_id' => $this->category->id,
            'is_hidden' => true, // Simular que fue ocultada
        ]);
    }

    /** @test */
    public function it_keeps_same_moderator_for_additional_appeals()
    {
        // 1. Moderador A oculta la publicación
        $moderationCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'assigned_moderator_id' => $this->moderatorA->id,
            'status' => 'action_taken',
            'source' => 'user_report',
            'report_count' => 1,
            'assigned_at' => now(),
        ]);

        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->moderatorA->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación ocultada',
        ]);

        // 2. Usuario apela por primera vez
        $this->actingAs($this->user)->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'La publicación no viola las reglas'
        ]);

        // Verificar que se asignó a Moderador B (diferente al original)
        $moderationCase->refresh();
        $this->assertEquals($this->moderatorB->id, $moderationCase->assigned_moderator_id);
        $this->assertEquals('appealed', $moderationCase->status);

        // 3. Usuario apela por segunda vez
        $response = $this->actingAs($this->user)->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Nueva información adicional'
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verificar que SIGUE asignado a Moderador B (no cambió)
        $moderationCase->refresh();
        $this->assertEquals($this->moderatorB->id, $moderationCase->assigned_moderator_id);
        $this->assertEquals('appealed', $moderationCase->status);

        // Verificar que se crearon ambas apelaciones
        $appeals = ModerationAppeal::where('moderation_case_id', $moderationCase->id)->get();
        $this->assertCount(2, $appeals);

        // Verificar el mensaje de éxito
        $this->assertStringContainsString('El moderador asignado revisará tu caso', session('success'));
    }

    /** @test */
    public function it_assigns_new_moderator_when_no_moderator_assigned()
    {
        // 1. Moderador A oculta la publicación
        $moderationCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'assigned_moderator_id' => $this->moderatorA->id,
            'status' => 'action_taken',
            'source' => 'user_report',
            'report_count' => 1,
            'assigned_at' => now(),
        ]);

        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->moderatorA->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación ocultada',
        ]);

        // 2. Cambiar manualmente a estado 'appealed' SIN asignar moderador
        $moderationCase->update([
            'status' => 'appealed',
            'assigned_moderator_id' => null,
            'assigned_at' => null,
        ]);

        // 3. Usuario apela
        $response = $this->actingAs($this->user)->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'La publicación no viola las reglas'
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verificar que se asignó a Moderador B (diferente al original)
        $moderationCase->refresh();
        $this->assertEquals($this->moderatorB->id, $moderationCase->assigned_moderator_id);
        $this->assertEquals('appealed', $moderationCase->status);

        // Verificar el mensaje de éxito
        $this->assertStringContainsString('Un moderador diferente revisará tu caso', session('success'));
    }

    /** @test */
    public function it_handles_multiple_appeals_correctly()
    {
        // 1. Moderador A oculta la publicación
        $moderationCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'assigned_moderator_id' => $this->moderatorA->id,
            'status' => 'action_taken',
            'source' => 'user_report',
            'report_count' => 1,
            'assigned_at' => now(),
        ]);

        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->moderatorA->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación ocultada',
        ]);

        // 2. Primera apelación
        $this->actingAs($this->user)->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Primera apelación'
        ]);

        $moderationCase->refresh();
        $assignedModeratorId = $moderationCase->assigned_moderator_id;
        $this->assertNotNull($assignedModeratorId);
        $this->assertNotEquals($this->moderatorA->id, $assignedModeratorId);

        // 3. Segunda apelación
        $this->actingAs($this->user)->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Segunda apelación'
        ]);

        // 4. Tercera apelación
        $this->actingAs($this->user)->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Tercera apelación'
        ]);

        // Verificar que el moderador asignado NO cambió
        $moderationCase->refresh();
        $this->assertEquals($assignedModeratorId, $moderationCase->assigned_moderator_id);

        // Verificar que se crearon todas las apelaciones
        $appeals = ModerationAppeal::where('moderation_case_id', $moderationCase->id)->get();
        $this->assertCount(3, $appeals);

        // Verificar que todas las apelaciones están pendientes de revisión
        foreach ($appeals as $appeal) {
            $this->assertNull($appeal->reviewed_at);
        }
    }
}
