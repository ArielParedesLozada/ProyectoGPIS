<?php

namespace Tests\Feature\Appeals;

use App\Models\User;
use App\Models\Publication;
use App\Models\ModerationCase;
use App\Models\ModerationAppeal;
use App\Models\ModerationAction;
use App\Enums\RoleType;
use App\Enums\StatusType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AppealStateChangeTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $moderator;
    protected Publication $publication;
    protected ModerationCase $moderationCase;

    protected function setUp(): void
    {
        parent::setUp();

        // Crear usuario propietario de la publicación
        $this->user = User::factory()->create([
            'role' => RoleType::VENDEDOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear moderador
        $this->moderator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear publicación
        $this->publication = Publication::factory()->create([
            'created_by' => $this->user->id,
            'is_hidden' => true,
        ]);

        // Crear caso de moderación con estado "action_taken"
        $this->moderationCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'assigned_moderator_id' => $this->moderator->id,
            'status' => 'action_taken',
            'source' => 'user',
            'assigned_at' => now(),
        ]);

        // Crear acción de moderación
        ModerationAction::create([
            'moderation_case_id' => $this->moderationCase->id,
            'moderator_id' => $this->moderator->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación oculta por moderador',
        ]);
    }

    public function test_appeal_changes_status_from_action_taken_to_appealed()
    {
        // Autenticar como el propietario de la publicación
        Auth::login($this->user);

        // Verificar estado inicial
        $this->assertEquals('action_taken', $this->moderationCase->status);
        $this->assertEquals($this->moderator->id, $this->moderationCase->assigned_moderator_id);

        // Enviar apelación
        $response = $this->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Creo que mi publicación no viola las reglas',
        ]);

        // Verificar respuesta
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Recargar el caso de moderación
        $this->moderationCase->refresh();

        // Verificar que el estado cambió a "appealed"
        $this->assertEquals('appealed', $this->moderationCase->status);

        // Verificar que se creó la apelación
        $this->assertDatabaseHas('moderation_appeals', [
            'moderation_case_id' => $this->moderationCase->id,
            'appealer_id' => $this->user->id,
            'appeal_reason' => 'Creo que mi publicación no viola las reglas',
        ]);

        // Verificar que se asignó un moderador diferente (o se dejó sin asignar si no hay otros)
        // Como solo hay un moderador, debería quedar sin asignar
        $this->assertNull($this->moderationCase->assigned_moderator_id);
    }

    public function test_appeal_with_multiple_moderators_assigns_different_one()
    {
        // Crear un segundo moderador
        $secondModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Autenticar como el propietario de la publicación
        Auth::login($this->user);

        // Enviar apelación
        $response = $this->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Creo que mi publicación no viola las reglas',
        ]);

        // Verificar respuesta
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Recargar el caso de moderación
        $this->moderationCase->refresh();

        // Verificar que el estado cambió a "appealed"
        $this->assertEquals('appealed', $this->moderationCase->status);

        // Verificar que se asignó el segundo moderador (diferente al original)
        $this->assertEquals($secondModerator->id, $this->moderationCase->assigned_moderator_id);
        $this->assertNotEquals($this->moderator->id, $this->moderationCase->assigned_moderator_id);
    }

    public function test_multiple_appeals_for_same_case_keep_same_moderator()
    {
        // Crear un segundo moderador
        $secondModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Autenticar como el propietario de la publicación
        Auth::login($this->user);

        // Primera apelación
        $response1 = $this->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Primera apelación',
        ]);

        $response1->assertRedirect();
        $response1->assertSessionHas('success');

        // Recargar el caso
        $this->moderationCase->refresh();
        $this->assertEquals('appealed', $this->moderationCase->status);
        $assignedModeratorId = $this->moderationCase->assigned_moderator_id;

        // Segunda apelación para el mismo caso
        $response2 = $this->post(route('publications.appeal', $this->publication->id), [
            'reason' => 'Segunda apelación',
        ]);

        $response2->assertRedirect();
        $response2->assertSessionHas('success');

        // Recargar el caso
        $this->moderationCase->refresh();

        // Verificar que sigue siendo el mismo moderador
        $this->assertEquals($assignedModeratorId, $this->moderationCase->assigned_moderator_id);
        $this->assertEquals('appealed', $this->moderationCase->status);

        // Verificar que se crearon ambas apelaciones
        $this->assertDatabaseHas('moderation_appeals', [
            'moderation_case_id' => $this->moderationCase->id,
            'appeal_reason' => 'Primera apelación',
        ]);

        $this->assertDatabaseHas('moderation_appeals', [
            'moderation_case_id' => $this->moderationCase->id,
            'appeal_reason' => 'Segunda apelación',
        ]);
    }
}
