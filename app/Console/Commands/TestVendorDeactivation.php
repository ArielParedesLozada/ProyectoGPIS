<?php

namespace App\Console\Commands;

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use App\Models\Publication;
use App\Models\Category;
use Illuminate\Console\Command;

class TestVendorDeactivation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:vendor-deactivation {vendor_id?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test vendor deactivation functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $vendorId = $this->argument('vendor_id');

        if ($vendorId) {
            $vendor = User::find($vendorId);
            if (!$vendor || $vendor->role !== RoleType::VENDEDOR->value) {
                $this->error("Vendor with ID {$vendorId} not found or is not a vendor.");
                return 1;
            }
            $this->testSpecificVendor($vendor);
        } else {
            $this->testWithMockData();
        }

        return 0;
    }

    private function testSpecificVendor(User $vendor)
    {
        $this->info("Testing vendor: {$vendor->name} {$vendor->surname} (ID: {$vendor->id})");
        
        // Mostrar estado actual
        $this->showVendorStatus($vendor);
        
        // Mostrar publicaciones actuales
        $this->showPublications($vendor);
        
        // Preguntar qué hacer
        $action = $this->choice('What would you like to do?', [
            'deactivate' => 'Deactivate vendor',
            'activate' => 'Activate vendor',
            'status' => 'Show current status',
            'exit' => 'Exit'
        ]);

        switch ($action) {
            case 'deactivate':
                $this->deactivateVendor($vendor);
                break;
            case 'activate':
                $this->activateVendor($vendor);
                break;
            case 'status':
                $this->showVendorStatus($vendor);
                $this->showPublications($vendor);
                break;
            case 'exit':
                $this->info('Exiting...');
                break;
        }
    }

    private function testWithMockData()
    {
        $this->info('Creating test data...');
        
        // Crear categoría si no existe
        $category = Category::firstOrCreate(['name' => 'Test Category']);
        
        // Crear vendedor de prueba
        $vendor = User::factory()->create([
            'role' => RoleType::VENDEDOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
            'name' => 'Test Vendor',
            'surname' => 'For Testing',
            'email' => 'test-vendor@example.com',
        ]);

        $this->info("Created test vendor: {$vendor->name} {$vendor->surname} (ID: {$vendor->id})");

        // Crear publicaciones de prueba
        $publications = [];
        for ($i = 1; $i <= 3; $i++) {
            $publications[] = Publication::factory()->create([
                'created_by' => $vendor->id,
                'category_id' => $category->id,
                'status' => StatusType::HABILITADO->value,
                'is_hidden' => false,
                'hidden_by_vendor_deactivation' => false,
                'title' => "Test Publication {$i}",
            ]);
        }

        $this->info("Created {$vendor->publications()->count()} test publications");

        // Mostrar estado inicial
        $this->showVendorStatus($vendor);
        $this->showPublications($vendor);

        // Desactivar vendedor
        $this->info("\n--- Deactivating vendor ---");
        $vendor->update(['is_active' => false]);
        $vendor->refresh();
        
        $this->showVendorStatus($vendor);
        $this->showPublications($vendor);

        // Reactivar vendedor
        $this->info("\n--- Reactivating vendor ---");
        $vendor->update(['is_active' => true]);
        $vendor->refresh();
        
        $this->showVendorStatus($vendor);
        $this->showPublications($vendor);

        $this->info("\nTest completed successfully!");
    }

    private function showVendorStatus(User $vendor)
    {
        $this->info("\n--- Vendor Status ---");
        $this->line("Name: {$vendor->name} {$vendor->surname}");
        $this->line("Email: {$vendor->email}");
        $this->line("Role: {$vendor->role}");
        $this->line("Status: " . ($vendor->is_active ? 'Active' : 'Inactive'));
        $this->line("Status Type: " . StatusType::from($vendor->status)->name);
    }

    private function showPublications(User $vendor)
    {
        $publications = $vendor->publications()->with('category')->get();
        
        $this->info("\n--- Publications ({$publications->count()}) ---");
        
        if ($publications->isEmpty()) {
            $this->line("No publications found.");
            return;
        }

        $headers = ['ID', 'Title', 'Status', 'Hidden', 'Hidden by Deactivation', 'Category'];
        $rows = [];

        foreach ($publications as $publication) {
            $rows[] = [
                $publication->id,
                $publication->title,
                StatusType::from($publication->status)->name,
                $publication->is_hidden ? 'Yes' : 'No',
                $publication->hidden_by_vendor_deactivation ? 'Yes' : 'No',
                $publication->category->name ?? 'N/A'
            ];
        }

        $this->table($headers, $rows);
    }

    private function deactivateVendor(User $vendor)
    {
        $this->info("Deactivating vendor {$vendor->name} {$vendor->surname}...");
        
        $beforeCount = $vendor->publications()->where('is_hidden', false)->count();
        
        $vendor->update(['is_active' => false]);
        $vendor->refresh();
        
        $afterCount = $vendor->publications()->where('is_hidden', true)->where('hidden_by_vendor_deactivation', true)->count();
        
        $this->info("Vendor deactivated. {$beforeCount} publications were hidden.");
        $this->showPublications($vendor);
    }

    private function activateVendor(User $vendor)
    {
        $this->info("Activating vendor {$vendor->name} {$vendor->surname}...");
        
        $beforeCount = $vendor->publications()->where('hidden_by_vendor_deactivation', true)->count();
        
        $vendor->update(['is_active' => true]);
        $vendor->refresh();
        
        $this->info("Vendor activated. {$beforeCount} publications were restored.");
        $this->showPublications($vendor);
    }
}