<?php

namespace Tests\Feature\Admin;

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\Publication;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModeratorAppealAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $originalModerator;
    protected Category $category;
    protected Publication $publication;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear un super admin para las pruebas
        $this->superAdmin = User::factory()->create([
            'role' => RoleType::SUPER_ADMIN->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear un moderador original
        $this->originalModerator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear una categoría
        $this->category = Category::factory()->create();
        
        // Crear una publicación
        $this->publication = Publication::factory()->create([
            'category_id' => $this->category->id,
            'is_hidden' => true, // Simular que fue ocultada
        ]);
    }

    /** @test */
    public function it_assigns_pending_appeals_to_new_moderator()
    {
        // 1. Crear un caso de moderación con el moderador original
        $moderationCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'assigned_moderator_id' => $this->originalModerator->id,
            'status' => 'action_taken',
            'source' => 'user_report',
            'report_count' => 1,
            'assigned_at' => now(),
        ]);

        // 2. Registrar la acción de ocultar (tomada por el moderador original)
        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->originalModerator->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación ocultada',
            'metadata' => [
                'publication_id' => $this->publication->id,
                'reason' => 'Contenido inapropiado',
            ]
        ]);

        // 3. Crear una apelación
        $appeal = ModerationAppeal::create([
            'moderation_case_id' => $moderationCase->id,
            'appealer_id' => User::factory()->create()->id,
            'appeal_reason' => 'La publicación no viola las reglas',
        ]);

        // 4. Cambiar el estado del caso a 'appealed' y desasignar
        $moderationCase->update([
            'status' => 'appealed',
            'assigned_moderator_id' => null,
            'assigned_at' => null,
        ]);

        // 5. Registrar que está esperando moderador
        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->originalModerator->id,
            'action_type' => 'close_case',
            'action_description' => 'Apelación en espera - No hay moderadores disponibles para revisar',
            'metadata' => [
                'original_moderator_id' => $this->originalModerator->id,
                'waiting_reason' => 'no_moderators_available',
                'status' => 'pending_moderator_assignment',
                'requires_manual_intervention' => true,
                'waiting_for_moderator' => true
            ]
        ]);

        // Verificar que la apelación está sin asignar
        $moderationCase->refresh();
        $this->assertNull($moderationCase->assigned_moderator_id);
        $this->assertEquals('appealed', $moderationCase->status);

        // 6. Crear un nuevo moderador
        $response = $this->actingAs($this->superAdmin)->post(route('admin.moderators.store'), [
            'cedula' => '1234567890',
            'name' => 'Juan',
            'surname' => 'Pérez',
            'email' => 'juan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '1234567890',
            'address' => 'Calle 123',
            'gender' => 'hombre',
        ]);

        $response->assertRedirect(route('admin.moderators.index'));
        $response->assertSessionHas('success');

        // 7. Verificar que se creó el nuevo moderador
        $newModerator = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($newModerator);
        $this->assertEquals(RoleType::MODERADOR->value, $newModerator->role);

        // 8. Verificar que la apelación fue asignada al nuevo moderador
        $moderationCase->refresh();
        $this->assertEquals($newModerator->id, $moderationCase->assigned_moderator_id);
        $this->assertNotNull($moderationCase->assigned_at);

        // 9. Verificar que se creó la acción de asignación automática
        $autoAssignment = ModerationAction::where('action_type', 'auto_assigned_appeal_to_new_moderator')
            ->where('moderator_id', $newModerator->id)
            ->first();
            
        $this->assertNotNull($autoAssignment);
        $this->assertEquals($moderationCase->id, $autoAssignment->moderation_case_id);
        $this->assertTrue($autoAssignment->metadata['appeal_assignment']);
        $this->assertEquals('appeal', $autoAssignment->metadata['case_type']);
        $this->assertEquals($this->originalModerator->id, $autoAssignment->metadata['original_moderator_id']);

        // 10. Verificar que el mensaje de éxito incluye la asignación
        $this->assertStringContainsString('Se asignaron 1 casos pendientes', session('success'));
    }

    /** @test */
    public function it_does_not_assign_appeal_to_same_moderator_who_took_original_action()
    {
        // 1. Crear un caso de moderación con el moderador original
        $moderationCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'assigned_moderator_id' => $this->originalModerator->id,
            'status' => 'action_taken',
            'source' => 'user_report',
            'report_count' => 1,
            'assigned_at' => now(),
        ]);

        // 2. Registrar la acción de ocultar (tomada por el moderador original)
        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->originalModerator->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación ocultada',
            'metadata' => [
                'publication_id' => $this->publication->id,
                'reason' => 'Contenido inapropiado',
            ]
        ]);

        // 3. Crear una apelación
        $appeal = ModerationAppeal::create([
            'moderation_case_id' => $moderationCase->id,
            'appealer_id' => User::factory()->create()->id,
            'appeal_reason' => 'La publicación no viola las reglas',
        ]);

        // 4. Cambiar el estado del caso a 'appealed' y desasignar
        $moderationCase->update([
            'status' => 'appealed',
            'assigned_moderator_id' => null,
            'assigned_at' => null,
        ]);

        // 5. Registrar que está esperando moderador
        ModerationAction::create([
            'moderation_case_id' => $moderationCase->id,
            'moderator_id' => $this->originalModerator->id,
            'action_type' => 'close_case',
            'action_description' => 'Apelación en espera - No hay moderadores disponibles para revisar',
            'metadata' => [
                'original_moderator_id' => $this->originalModerator->id,
                'waiting_reason' => 'no_moderators_available',
                'status' => 'pending_moderator_assignment',
                'requires_manual_intervention' => true,
                'waiting_for_moderator' => true
            ]
        ]);

        // 6. Crear un nuevo moderador con el MISMO ID que el original (simulando que es el mismo)
        // Esto no debería pasar en la realidad, pero es para probar la lógica
        $response = $this->actingAs($this->superAdmin)->post(route('admin.moderators.store'), [
            'cedula' => '1234567891',
            'name' => 'Juan',
            'surname' => 'Pérez',
            'email' => 'juan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '1234567891',
            'address' => 'Calle 123',
            'gender' => 'hombre',
        ]);

        $response->assertRedirect(route('admin.moderators.index'));

        // 7. Verificar que se creó el nuevo moderador
        $newModerator = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($newModerator);

        // 8. Verificar que la apelación NO fue asignada (porque sería el mismo moderador)
        $moderationCase->refresh();
        $this->assertNull($moderationCase->assigned_moderator_id);

        // 9. Verificar que NO se creó la acción de asignación automática de apelación
        $autoAssignment = ModerationAction::where('action_type', 'auto_assigned_appeal_to_new_moderator')
            ->where('moderator_id', $newModerator->id)
            ->first();
            
        $this->assertNull($autoAssignment);
    }

    /** @test */
    public function it_assigns_both_normal_cases_and_appeals_to_new_moderator()
    {
        // 1. Crear un caso normal pendiente
        $normalCase = ModerationCase::create([
            'publication_id' => $this->publication->id,
            'status' => 'pending',
            'source' => 'user_report',
            'report_count' => 1,
        ]);

        // 2. Crear un caso de apelación pendiente
        $appealCase = ModerationCase::create([
            'publication_id' => Publication::factory()->create(['category_id' => $this->category->id])->id,
            'assigned_moderator_id' => $this->originalModerator->id,
            'status' => 'action_taken',
            'source' => 'user_report',
            'report_count' => 1,
        ]);

        // Registrar acción original
        ModerationAction::create([
            'moderation_case_id' => $appealCase->id,
            'moderator_id' => $this->originalModerator->id,
            'action_type' => 'hide_publication',
            'action_description' => 'Publicación ocultada',
        ]);

        // Crear apelación
        ModerationAppeal::create([
            'moderation_case_id' => $appealCase->id,
            'appealer_id' => User::factory()->create()->id,
            'appeal_reason' => 'La publicación no viola las reglas',
        ]);

        // Cambiar a estado appealed y desasignar
        $appealCase->update([
            'status' => 'appealed',
            'assigned_moderator_id' => null,
            'assigned_at' => null,
        ]);

        // Registrar espera
        ModerationAction::create([
            'moderation_case_id' => $appealCase->id,
            'moderator_id' => $this->originalModerator->id,
            'action_type' => 'close_case',
            'action_description' => 'Apelación en espera',
            'metadata' => [
                'waiting_for_moderator' => true
            ]
        ]);

        // 3. Crear nuevo moderador
        $response = $this->actingAs($this->superAdmin)->post(route('admin.moderators.store'), [
            'cedula' => '1234567890',
            'name' => 'Juan',
            'surname' => 'Pérez',
            'email' => 'juan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '1234567890',
            'address' => 'Calle 123',
            'gender' => 'hombre',
        ]);

        $response->assertRedirect(route('admin.moderators.index'));

        // 4. Verificar que ambos casos fueron asignados
        $newModerator = User::where('email', 'juan@example.com')->first();
        
        $normalCase->refresh();
        $appealCase->refresh();
        
        $this->assertEquals($newModerator->id, $normalCase->assigned_moderator_id);
        $this->assertEquals($newModerator->id, $appealCase->assigned_moderator_id);

        // 5. Verificar que se crearon ambas acciones de asignación
        $normalAssignment = ModerationAction::where('action_type', 'auto_assigned_to_new_moderator')
            ->where('moderator_id', $newModerator->id)
            ->first();
            
        $appealAssignment = ModerationAction::where('action_type', 'auto_assigned_appeal_to_new_moderator')
            ->where('moderator_id', $newModerator->id)
            ->first();
            
        $this->assertNotNull($normalAssignment);
        $this->assertNotNull($appealAssignment);

        // 6. Verificar el mensaje de éxito
        $this->assertStringContainsString('Se asignaron 2 casos pendientes', session('success'));
    }
}
