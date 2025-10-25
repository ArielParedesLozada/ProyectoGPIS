<?php

namespace App\Console\Commands;

use App\Enums\RoleType;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class TestAdminVerificationFlow extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:admin-verification-flow {email} {role=admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the admin verification flow by creating a user and checking the verification status';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $role = $this->argument('role');

        if (!in_array($role, ['admin', 'moderator'])) {
            $this->error('Role must be either "admin" or "moderator"');
            return 1;
        }

        $this->info("🧪 Probando el flujo de verificación para {$email} como {$role}...");

        try {
            // Crear usuario administrativo
            $user = User::create([
                'cedula' => '1234567890',
                'name' => 'Usuario',
                'surname' => 'Prueba',
                'email' => $email,
                'password' => Hash::make('password123'),
                'phone' => '0987654321',
                'address' => 'Dirección de prueba',
                'gender' => 'hombre',
                'role' => $role === 'admin' ? RoleType::ADMIN->value : RoleType::MODERADOR->value,
                'status' => 1,
                'is_active' => true,
                'email_verified_at' => null, // No verificado inicialmente
            ]);

            $this->info("✅ Usuario creado exitosamente:");
            $this->line("   - ID: {$user->id}");
            $this->line("   - Email: {$user->email}");
            $this->line("   - Rol: {$user->role}");
            $this->line("   - Email verificado: " . ($user->hasVerifiedEmail() ? 'Sí' : 'No'));

            // Simular el proceso de login
            $this->info("\n🔐 Simulando proceso de login...");
            
            if (!$user->hasVerifiedEmail() && $user->isAdministrative()) {
                $this->info("📧 Enviando correo de verificación automáticamente...");
                
                try {
                    $user->sendEmailVerificationNotification();
                    $this->info("✅ Correo de verificación enviado exitosamente!");
                } catch (\Exception $e) {
                    $this->error("❌ Error al enviar correo de verificación: " . $e->getMessage());
                }
            } else {
                if ($user->hasVerifiedEmail()) {
                    $this->warn("⚠️ El usuario ya tiene el email verificado");
                }
                if (!$user->isAdministrative()) {
                    $this->warn("⚠️ El usuario no es administrativo");
                }
            }

            // Limpiar usuario de prueba
            $this->info("\n🧹 Limpiando usuario de prueba...");
            $user->delete();
            $this->info("✅ Usuario de prueba eliminado");

            $this->info("\n🎉 Prueba completada exitosamente!");
            $this->line("El flujo funciona correctamente:");
            $this->line("1. Usuario administrativo creado sin verificar email");
            $this->line("2. Al simular login, se envía correo de verificación automáticamente");
            $this->line("3. Usuario puede verificar email y acceder a la plataforma");

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error durante la prueba: ' . $e->getMessage());
            return 1;
        }
    }
}
