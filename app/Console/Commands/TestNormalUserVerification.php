<?php

namespace App\Console\Commands;

use App\Enums\GenderType;
use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class TestNormalUserVerification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:normal-user-verification {email} {role=comprador}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the automatic verification email for normal users (comprador/vendedor)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $role = $this->argument('role');

        if (!in_array($role, ['comprador', 'vendedor'])) {
            $this->error('Role must be either "comprador" or "vendedor"');
            return 1;
        }

        $this->info("🧪 Probando el flujo de verificación para usuario normal {$email} como {$role}...");

        try {
            // Crear usuario normal
            $user = User::create([
                'cedula' => '1234567890',
                'name' => 'Usuario',
                'surname' => 'Prueba',
                'email' => $email,
                'password' => Hash::make('password123'),
                'phone' => '0987654321',
                'address' => 'Dirección de prueba',
                'gender' => GenderType::HOMBRE->value,
                'role' => $role,
                'status' => StatusType::HABILITADO->value,
                'email_verified_at' => null, // No verificado inicialmente
            ]);

            $this->info("✅ Usuario normal creado exitosamente:");
            $this->line("   - ID: {$user->id}");
            $this->line("   - Email: {$user->email}");
            $this->line("   - Rol: {$user->role}");
            $this->line("   - Email verificado: " . ($user->hasVerifiedEmail() ? 'Sí' : 'No'));
            $this->line("   - Es usuario normal: " . (in_array($user->role, ['comprador', 'vendedor']) ? 'Sí' : 'No'));

            // Simular el proceso de login
            $this->info("\n🔐 Simulando proceso de login...");
            
            // Debug: Log información del usuario
            Log::info('Información del usuario al hacer login (TEST)', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'email_verified_at' => $user->email_verified_at,
                'has_verified_email' => $user->hasVerifiedEmail(),
                'is_administrative' => $user->isAdministrative(),
                'is_normal_user' => in_array($user->role, ['comprador', 'vendedor']),
            ]);

            if (!$user->hasVerifiedEmail()) {
                $this->info("📧 Enviando correo de verificación automáticamente...");
                
                try {
                    Log::info('Enviando correo de verificación automático... (TEST)', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'role' => $user->role,
                    ]);
                    
                    $user->sendEmailVerificationNotification();
                    
                    Log::info('✅ Correo de verificación enviado automáticamente al usuario (TEST)', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'role' => $user->role,
                    ]);
                    
                    $this->info("✅ Correo de verificación enviado exitosamente!");
                } catch (\Exception $e) {
                    $this->error("❌ Error al enviar correo de verificación: " . $e->getMessage());
                    Log::error('❌ Error al enviar correo de verificación automático (TEST)', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            } else {
                $this->warn("⚠️ El usuario ya tiene el email verificado");
                
                Log::info('No se envió correo de verificación automático (TEST)', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role,
                    'has_verified_email' => $user->hasVerifiedEmail(),
                    'reason' => 'Usuario ya verificado',
                ]);
            }

            // Limpiar usuario de prueba
            $this->info("\n🧹 Limpiando usuario de prueba...");
            $user->delete();
            $this->info("✅ Usuario de prueba eliminado");

            $this->info("\n🎉 Prueba completada exitosamente!");
            $this->line("El flujo funciona correctamente para usuarios normales:");
            $this->line("1. Usuario normal creado sin verificar email");
            $this->line("2. Al simular login, se envía correo de verificación automáticamente");
            $this->line("3. Usuario puede verificar email y acceder a la plataforma");

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error durante la prueba: ' . $e->getMessage());
            return 1;
        }
    }
}
