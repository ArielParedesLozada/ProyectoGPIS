<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class TestCustomVerificationEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:custom-verification-email {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the custom verification email design';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');

        $this->info("🧪 Probando el correo personalizado de verificación para {$email}...");

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
            $this->line("   - Nombre: {$user->name} {$user->surname}");

            // Enviar correo de verificación personalizado
            $this->info("\n📧 Enviando correo de verificación personalizado...");
            
            try {
                $user->sendEmailVerificationNotification();
                
                $this->info("✅ Correo de verificación personalizado enviado exitosamente!");
                $this->line("Revisa el correo en {$email}");
                $this->line("El correo debería tener el mismo diseño que el correo de credenciales.");
                
            } catch (\Exception $e) {
                $this->error("❌ Error al enviar correo de verificación: " . $e->getMessage());
                return 1;
            }

            $this->info("\n🎉 Prueba completada exitosamente!");
            $this->line("El correo personalizado funciona correctamente.");

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error durante la prueba: ' . $e->getMessage());
            return 1;
        }
    }
}
