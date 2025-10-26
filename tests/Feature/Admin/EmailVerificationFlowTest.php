<?php

namespace Tests\Feature\Admin;

use App\Enums\RoleType;
use App\Enums\StatusType;
use App\Models\User;
use App\Models\ModerationCase;
use App\Models\ModerationAction;
use App\Models\Publication;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use App\Mail\AdminUserWelcomeEmail;
use App\Mail\CustomEmailVerification;
use Tests\TestCase;

class EmailVerificationFlowTest extends TestCase
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
    public function it_only_sends_credentials_email_when_creating_moderator()
    {
        Mail::fake();

        // Crear un moderador
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
        $this->assertNull($moderator->email_verified_at); // No debe estar verificado

        // Verificar que SOLO se envió el correo de credenciales
        Mail::assertSent(AdminUserWelcomeEmail::class, function ($mail) use ($moderator) {
            return $mail->hasTo($moderator->email);
        });

        // Verificar que NO se envió el correo de verificación
        Mail::assertNotSent(CustomEmailVerification::class);
    }

    /** @test */
    public function it_only_sends_credentials_email_when_creating_admin()
    {
        Mail::fake();

        // Crear un administrador
        $response = $this->actingAs($this->superAdmin)->post(route('admin.admins.store'), [
            'cedula' => '1234567890',
            'name' => 'María',
            'surname' => 'García',
            'email' => 'maria@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '1234567890',
            'address' => 'Calle 123',
            'gender' => 'mujer',
        ]);

        $response->assertRedirect(route('admin.admins.index'));
        $response->assertSessionHas('success');

        // Verificar que se creó el administrador
        $admin = User::where('email', 'maria@example.com')->first();
        $this->assertNotNull($admin);
        $this->assertEquals(RoleType::ADMIN->value, $admin->role);
        $this->assertNull($admin->email_verified_at); // No debe estar verificado

        // Verificar que SOLO se envió el correo de credenciales
        Mail::assertSent(AdminUserWelcomeEmail::class, function ($mail) use ($admin) {
            return $mail->hasTo($admin->email);
        });

        // Verificar que NO se envió el correo de verificación
        Mail::assertNotSent(CustomEmailVerification::class);
    }

    /** @test */
    public function it_sends_verification_email_when_moderator_logs_in_first_time()
    {
        Mail::fake();

        // Crear un moderador sin verificar
        $moderator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
            'email_verified_at' => null, // No verificado
        ]);

        // Simular login del moderador
        $response = $this->post(route('login.login'), [
            'email' => $moderator->email,
            'password' => 'password', // password por defecto del factory
        ]);

        $response->assertRedirect(route('publication-index'));

        // Verificar que se envió el correo de verificación
        Mail::assertSent(CustomEmailVerification::class, function ($mail) use ($moderator) {
            return $mail->hasTo($moderator->email);
        });
    }

    /** @test */
    public function it_sends_verification_email_when_admin_logs_in_first_time()
    {
        Mail::fake();

        // Crear un administrador sin verificar
        $admin = User::factory()->create([
            'role' => RoleType::ADMIN->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
            'email_verified_at' => null, // No verificado
        ]);

        // Simular login del administrador
        $response = $this->post(route('login.login'), [
            'email' => $admin->email,
            'password' => 'password', // password por defecto del factory
        ]);

        $response->assertRedirect(route('publication-index'));

        // Verificar que se envió el correo de verificación
        Mail::assertSent(CustomEmailVerification::class, function ($mail) use ($admin) {
            return $mail->hasTo($admin->email);
        });
    }

    /** @test */
    public function it_does_not_send_verification_email_when_user_is_already_verified()
    {
        Mail::fake();

        // Crear un moderador ya verificado
        $moderator = User::factory()->create([
            'role' => RoleType::MODERADOR->value,
            'status' => StatusType::HABILITADO->value,
            'is_active' => true,
            'email_verified_at' => now(), // Ya verificado
        ]);

        // Simular login del moderador
        $response = $this->post(route('login.login'), [
            'email' => $moderator->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('publication-index'));

        // Verificar que NO se envió el correo de verificación
        Mail::assertNotSent(CustomEmailVerification::class);
    }
}
