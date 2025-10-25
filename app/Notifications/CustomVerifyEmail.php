<?php

namespace App\Notifications;

use App\Mail\CustomEmailVerification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class CustomVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);
        
        // Retornar un MailMessage que use nuestro mailable personalizado
        return (new MailMessage)
            ->view('emails.email-verification', [
                'user' => $notifiable,
                'verificationUrl' => $verificationUrl,
                'loginUrl' => route('login'),
            ])
            ->subject('Verificar dirección de email - Plataforma GPIS');
    }
}
