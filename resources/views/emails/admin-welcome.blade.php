<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido como {{ $roleName }} - Plataforma GPIS</title>
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
            background-color: #2563eb;
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
        <h1>¡Bienvenido a la Plataforma GPIS!</h1>
        <p>Tu cuenta como {{ $roleName }} ha sido creada exitosamente</p>
    </div>
    
    <div class="content">
        <h2>Hola {{ $user->name }} {{ $user->surname }},</h2>
        
        <p>Te damos la bienvenida a la Plataforma GPIS como <strong>{{ $roleName }}</strong>. Tu cuenta ha sido creada exitosamente y ya puedes acceder al sistema.</p>
        
        <div class="credentials">
            <h3>📧 Credenciales de Acceso:</h3>
            <p><strong>Email:</strong> {{ $user->email }}</p>
            <p><strong>Contraseña temporal:</strong> {{ $password }}</p>
        </div>
        
        <div class="warning">
            <h4>⚠️ Importante:</h4>
            <p>Por razones de seguridad, te recomendamos cambiar tu contraseña temporal en tu primer inicio de sesión.</p>
        </div>
        
        <div class="credentials">
            <h3>📧 Verificación de Email:</h3>
            <p>Al iniciar sesión por primera vez, se te enviará automáticamente un correo de verificación para completar el proceso de registro y acceder a todas las funcionalidades de la plataforma.</p>
        </div>
        
        <p>Puedes acceder a la plataforma haciendo clic en el siguiente botón:</p>
        
        <a href="{{ $loginUrl }}" class="button">Acceder a la Plataforma</a>
        
        <h3>🎯 Funcionalidades disponibles como {{ $roleName }}:</h3>
        <ul>
            @if($role === 'admin')
                <li>Gestión completa de usuarios</li>
                <li>Administración de moderadores</li>
                <li>Supervisión de publicaciones</li>
                <li>Acceso a reportes y estadísticas</li>
            @else
                <li>Moderación de publicaciones</li>
                <li>Gestión de usuarios básicos</li>
                <li>Revisión de contenido</li>
                <li>Acceso a herramientas de moderación</li>
            @endif
        </ul>
        
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
