<?php

namespace Tests\Feature;

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use App\Models\Publication;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorDeactivationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $vendor;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear un admin para las pruebas
        $this->admin = User::factory()->create([
            'role' => RoleType::ADMIN->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear un vendedor para las pruebas
        $this->vendor = User::factory()->create([
            'role' => RoleType::VENDEDOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear una categoría
        $this->category = Category::factory()->create();
    }

    /** @test */
    public function it_hides_available_publications_when_vendor_is_deactivated()
    {
        // Crear publicaciones disponibles del vendedor
        $availablePublication1 = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => false,
            'hidden_by_vendor_deactivation' => false,
        ]);

        $availablePublication2 = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => false,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Crear una publicación ya oculta (no debe ser afectada)
        $alreadyHiddenPublication = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => true,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Desactivar el vendedor
        $this->vendor->update(['is_active' => false]);

        // Verificar que las publicaciones disponibles fueron ocultadas
        $availablePublication1->refresh();
        $availablePublication2->refresh();
        $alreadyHiddenPublication->refresh();

        $this->assertTrue($availablePublication1->is_hidden);
        $this->assertTrue($availablePublication1->hidden_by_vendor_deactivation);
        
        $this->assertTrue($availablePublication2->is_hidden);
        $this->assertTrue($availablePublication2->hidden_by_vendor_deactivation);

        // La publicación ya oculta no debe cambiar
        $this->assertTrue($alreadyHiddenPublication->is_hidden);
        $this->assertFalse($alreadyHiddenPublication->hidden_by_vendor_deactivation);
    }

    /** @test */
    public function it_restores_publications_when_vendor_is_reactivated()
    {
        // Crear publicaciones que fueron ocultadas por desactivación
        $hiddenByDeactivation1 = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => true,
            'hidden_by_vendor_deactivation' => true,
        ]);

        $hiddenByDeactivation2 = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => true,
            'hidden_by_vendor_deactivation' => true,
        ]);

        // Crear una publicación oculta por otra razón (no debe ser afectada)
        $hiddenByOtherReason = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => true,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Activar el vendedor
        $this->vendor->update(['is_active' => true]);

        // Verificar que las publicaciones ocultas por desactivación fueron restauradas
        $hiddenByDeactivation1->refresh();
        $hiddenByDeactivation2->refresh();
        $hiddenByOtherReason->refresh();

        $this->assertFalse($hiddenByDeactivation1->is_hidden);
        $this->assertFalse($hiddenByDeactivation1->hidden_by_vendor_deactivation);
        
        $this->assertFalse($hiddenByDeactivation2->is_hidden);
        $this->assertFalse($hiddenByDeactivation2->hidden_by_vendor_deactivation);

        // La publicación oculta por otra razón no debe cambiar
        $this->assertTrue($hiddenByOtherReason->is_hidden);
        $this->assertFalse($hiddenByOtherReason->hidden_by_vendor_deactivation);
    }

    /** @test */
    public function it_handles_mixed_scenario_correctly()
    {
        // Crear publicaciones disponibles
        $availablePublication = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => false,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Crear publicación ya oculta por otra razón
        $alreadyHiddenPublication = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => true,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Desactivar el vendedor
        $this->vendor->update(['is_active' => false]);

        // Verificar estado después de desactivación
        $availablePublication->refresh();
        $alreadyHiddenPublication->refresh();

        $this->assertTrue($availablePublication->is_hidden);
        $this->assertTrue($availablePublication->hidden_by_vendor_deactivation);
        
        $this->assertTrue($alreadyHiddenPublication->is_hidden);
        $this->assertFalse($alreadyHiddenPublication->hidden_by_vendor_deactivation);

        // Activar el vendedor nuevamente
        $this->vendor->update(['is_active' => true]);

        // Verificar estado después de reactivación
        $availablePublication->refresh();
        $alreadyHiddenPublication->refresh();

        $this->assertFalse($availablePublication->is_hidden);
        $this->assertFalse($availablePublication->hidden_by_vendor_deactivation);
        
        $this->assertTrue($alreadyHiddenPublication->is_hidden);
        $this->assertFalse($alreadyHiddenPublication->hidden_by_vendor_deactivation);
    }

    /** @test */
    public function it_does_not_affect_publications_of_other_vendors()
    {
        // Crear otro vendedor
        $otherVendor = User::factory()->create([
            'role' => RoleType::VENDEDOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
        ]);

        // Crear publicaciones del vendedor original
        $originalVendorPublication = Publication::factory()->create([
            'created_by' => $this->vendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => false,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Crear publicaciones del otro vendedor
        $otherVendorPublication = Publication::factory()->create([
            'created_by' => $otherVendor->id,
            'category_id' => $this->category->id,
            'status' => StatusType::HABILITADO->value,
            'is_hidden' => false,
            'hidden_by_vendor_deactivation' => false,
        ]);

        // Desactivar solo el vendedor original
        $this->vendor->update(['is_active' => false]);

        // Verificar que solo las publicaciones del vendedor original fueron afectadas
        $originalVendorPublication->refresh();
        $otherVendorPublication->refresh();

        $this->assertTrue($originalVendorPublication->is_hidden);
        $this->assertTrue($originalVendorPublication->hidden_by_vendor_deactivation);
        
        $this->assertFalse($otherVendorPublication->is_hidden);
        $this->assertFalse($otherVendorPublication->hidden_by_vendor_deactivation);
    }
}