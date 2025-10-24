<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminUserWelcomeEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public User $user;
    public string $password;
    public string $role;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $password, string $role)
    {
        $this->user = $user;
        $this->password = $password;
        $this->role = $role;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $roleName = $this->role === 'admin' ? 'Administrador' : 'Moderador';
        
        return new Envelope(
            subject: "Bienvenido como {$roleName} - Plataforma GPIS",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            html: 'emails.admin-welcome',
            text: 'emails.admin-welcome-text',
            with: [
                'user' => $this->user,
                'password' => $this->password,
                'role' => $this->role,
                'roleName' => $this->role === 'admin' ? 'Administrador' : 'Moderador',
                'loginUrl' => route('login'),
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
