<?php

namespace Tests\Feature\Admin;

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\Publication;
use App\Models\User;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModeratorUserControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear un super admin para las pruebas
        $this->superAdmin = User::factory()->create([
            'role' => RoleType::SUPER_ADMIN->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function it_assigns_pending_cases_when_creating_new_moderator()
    {
        // Crear una categoría
        $category = Category::factory()->create();
        
        // Crear algunas publicaciones
        $publication1 = Publication::factory()->create(['category_id' => $category->id]);
        $publication2 = Publication::factory()->create(['category_id' => $category->id]);
        
        // Crear casos de moderación pendientes sin asignar
        $pendingCase1 = ModerationCase::create([
            'publication_id' => $publication1->id,
            'status' => 'pending',
            'source' => 'user_report',
            'report_count' => 1,
        ]);
        
        $pendingCase2 = ModerationCase::create([
            'publication_id' => $publication2->id,
            'status' => 'in_review',
            'source' => 'user_report',
            'report_count' => 1,
        ]);
        
        // Verificar que los casos están sin asignar
        $this->assertNull($pendingCase1->assigned_moderator_id);
        $this->assertNull($pendingCase2->assigned_moderator_id);
        
        // Crear un nuevo moderador
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
        
        // Verificar que se creó el moderador
        $moderator = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($moderator);
        $this->assertEquals(RoleType::MODERADOR->value, $moderator->role);
        
        // Verificar que los casos pendientes fueron asignados al nuevo moderador
        $pendingCase1->refresh();
        $pendingCase2->refresh();
        
        $this->assertEquals($moderator->id, $pendingCase1->assigned_moderator_id);
        $this->assertEquals($moderator->id, $pendingCase2->assigned_moderator_id);
        
        // Verificar que se crearon las acciones de asignación automática
        $autoAssignments = ModerationAction::where('action_type', 'auto_assigned_to_new_moderator')
            ->where('moderator_id', $moderator->id)
            ->get();
            
        $this->assertCount(2, $autoAssignments);
        
        // Verificar que el mensaje de éxito incluye el número de casos asignados
        $this->assertStringContainsString('Se asignaron 2 casos pendientes', session('success'));
    }

    /** @test */
    public function it_does_not_assign_cases_when_no_pending_cases_exist()
    {
        // Crear un nuevo moderador sin casos pendientes
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
        
        // Verificar que se creó el moderador
        $moderator = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($moderator);
        
        // Verificar que no se crearon acciones de asignación automática
        $autoAssignments = ModerationAction::where('action_type', 'auto_assigned_to_new_moderator')
            ->where('moderator_id', $moderator->id)
            ->get();
            
        $this->assertCount(0, $autoAssignments);
        
        // Verificar que el mensaje de éxito indica que no se asignaron casos
        $this->assertStringContainsString('Se asignaron 0 casos pendientes', session('success'));
    }
}
