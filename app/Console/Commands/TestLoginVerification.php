<?php

namespace App\Console\Commands;

use App\Enums\RoleType;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class TestLoginVerification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:login-verification {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the login verification flow for an existing admin user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');

        $this->info("🧪 Probando el flujo de verificación al login para {$email}...");

        try {
            // Buscar el usuario existente
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                $this->error("❌ Usuario no encontrado con email: {$email}");
                return 1;
            }

            $this->info("✅ Usuario encontrado:");
            $this->line("   - ID: {$user->id}");
            $this->line("   - Email: {$user->email}");
            $this->line("   - Rol: {$user->role}");
            $this->line("   - Email verificado: " . ($user->hasVerifiedEmail() ? 'Sí' : 'No'));
            $this->line("   - Es administrativo: " . ($user->isAdministrative() ? 'Sí' : 'No'));

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
            ]);

            if (!$user->hasVerifiedEmail() && $user->isAdministrative()) {
                $this->info("📧 Enviando correo de verificación automáticamente...");
                
                try {
                    Log::info('Enviando correo de verificación automático... (TEST)', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'role' => $user->role,
                    ]);
                    
                    $user->sendEmailVerificationNotification();
                    
                    Log::info('✅ Correo de verificación enviado automáticamente al usuario administrativo (TEST)', [
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
                $this->warn("⚠️ No se envió correo de verificación:");
                if ($user->hasVerifiedEmail()) {
                    $this->warn("   - El usuario ya tiene el email verificado");
                }
                if (!$user->isAdministrative()) {
                    $this->warn("   - El usuario no es administrativo");
                }
                
                Log::info('No se envió correo de verificación automático (TEST)', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role,
                    'has_verified_email' => $user->hasVerifiedEmail(),
                    'is_administrative' => $user->isAdministrative(),
                    'reason' => !$user->hasVerifiedEmail() ? 'Usuario ya verificado' : 'Usuario no administrativo',
                ]);
            }

            $this->info("\n🎉 Prueba completada!");
            $this->line("Revisa los logs para más detalles sobre el proceso.");

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error durante la prueba: ' . $e->getMessage());
            return 1;
        }
    }
}
