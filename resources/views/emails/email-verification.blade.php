<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificar Email - Plataforma GPIS</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .credentials {
            background-color: #e0f2fe;
            border-left: 4px solid #0284c7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .button {
            display: inline-block;
            background-color: #16a34a;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>¡Verifica tu Email!</h1>
        <p>Completa tu registro en la Plataforma GPIS</p>
    </div>
    
    <div class="content">
        <h2>Hola {{ $user->name }} {{ $user->surname }},</h2>
        
        <p>¡Gracias por registrarte en la Plataforma GPIS! Para completar tu registro y acceder a todas las funcionalidades, necesitas verificar tu dirección de email.</p>
        
        <div class="credentials">
            <h3>📧 Información de tu cuenta:</h3>
            <p><strong>Email:</strong> {{ $user->email }}</p>
            <p><strong>Rol:</strong> {{ ucfirst($user->role) }}</p>
        </div>
        
        <div class="warning">
            <h4>⚠️ Importante:</h4>
            <p>Este enlace de verificación expirará en 60 minutos por razones de seguridad.</p>
        </div>
        
        <p>Haz clic en el siguiente botón para verificar tu email:</p>
        
        <a href="{{ $verificationUrl }}" class="button">Verificar mi Email</a>
        
        <div class="credentials">
            <h3>🔗 ¿No puedes hacer clic en el botón?</h3>
            <p>Copia y pega el siguiente enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                {{ $verificationUrl }}
            </p>
        </div>
        
        <h3>🎯 Después de verificar tu email podrás:</h3>
        <ul>
            @if($user->role === 'admin')
                <li>Gestionar usuarios del sistema</li>
                <li>Administrar moderadores</li>
                <li>Supervisar publicaciones</li>
                <li>Acceder a reportes y estadísticas</li>
            @elseif($user->role === 'moderador')
                <li>Moderar publicaciones</li>
                <li>Gestionar usuarios básicos</li>
                <li>Revisar contenido</li>
                <li>Acceder a herramientas de moderación</li>
            @else
                <li>Crear y gestionar publicaciones</li>
                <li>Contactar con otros usuarios</li>
                <li>Acceder a todas las funcionalidades de la plataforma</li>
            @endif
        </ul>
        
        <p>Si no creaste una cuenta en la Plataforma GPIS, puedes ignorar este correo de forma segura.</p>
        
        <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al equipo de soporte.</p>
        
        <p>¡Esperamos que tengas una excelente experiencia en la plataforma!</p>
        
        <p>Saludos cordiales,<br>
        <strong>Equipo GPIS</strong></p>
    </div>
    
    <div class="footer">
        <p>Este es un correo automático del sistema. Por favor, no respondas a este mensaje.</p>
        <p>© {{ date('Y') }} Plataforma GPIS. Todos los derechos reservados.</p>
    </div>
</body>
</html>
