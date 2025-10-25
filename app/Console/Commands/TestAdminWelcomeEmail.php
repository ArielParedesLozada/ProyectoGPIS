<?php

namespace App\Console\Commands;

use App\Mail\AdminUserWelcomeEmail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestAdminWelcomeEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:admin-welcome-email {email} {role=admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the admin welcome email functionality';

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

        // Crear un usuario temporal para la prueba
        $user = new User([
            'name' => 'Usuario',
            'surname' => 'Prueba',
            'email' => $email,
        ]);

        $password = 'password123';

        try {
            $this->info("Enviando correo de bienvenida a {$email} como {$role}...");
            
            Mail::to($email)->send(
                new AdminUserWelcomeEmail($user, $password, $role)
            );

            $this->info('✅ Correo enviado exitosamente!');
            $this->line("Revisa el correo en {$email}");
            
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error al enviar el correo: ' . $e->getMessage());
            return 1;
        }
    }
}
