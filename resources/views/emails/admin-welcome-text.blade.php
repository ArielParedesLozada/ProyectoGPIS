BIENVENIDO COMO {{ strtoupper($roleName) }} - PLATAFORMA GPIS

Hola {{ $user->name }} {{ $user->surname }},

Te damos la bienvenida a la Plataforma GPIS como {{ $roleName }}. Tu cuenta ha sido creada exitosamente y ya puedes acceder al sistema.

CREDENCIALES DE ACCESO:
- Email: {{ $user->email }}
- Contraseña temporal: {{ $password }}

IMPORTANTE:
Por razones de seguridad, te recomendamos cambiar tu contraseña temporal en tu primer inicio de sesión.

VERIFICACIÓN DE EMAIL:
Al iniciar sesión por primera vez, se te enviará automáticamente un correo de verificación para completar el proceso de registro y acceder a todas las funcionalidades de la plataforma.

Para acceder a la plataforma, visita: {{ $loginUrl }}

FUNCIONALIDADES DISPONIBLES COMO {{ strtoupper($roleName) }}:
@if($role === 'admin')
- Gestión completa de usuarios
- Administración de moderadores
- Supervisión de publicaciones
- Acceso a reportes y estadísticas
@else
- Moderación de publicaciones
- Gestión de usuarios básicos
- Revisión de contenido
- Acceso a herramientas de moderación
@endif

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al equipo de soporte.

¡Esperamos que tengas una excelente experiencia en la plataforma!

Saludos cordiales,
Equipo GPIS

---
Este es un correo automático del sistema. Por favor, no respondas a este mensaje.
© {{ date('Y') }} Plataforma GPIS. Todos los derechos reservados.
