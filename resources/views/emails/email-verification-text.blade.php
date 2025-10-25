VERIFICAR EMAIL - PLATAFORMA GPIS

Hola {{ $user->name }} {{ $user->surname }},

¡Gracias por registrarte en la Plataforma GPIS! Para completar tu registro y acceder a todas las funcionalidades, necesitas verificar tu dirección de email.

INFORMACIÓN DE TU CUENTA:
- Email: {{ $user->email }}
- Rol: {{ ucfirst($user->role) }}

IMPORTANTE:
Este enlace de verificación expirará en 60 minutos por razones de seguridad.

Para verificar tu email, visita el siguiente enlace:
{{ $verificationUrl }}

DESPUÉS DE VERIFICAR TU EMAIL PODRÁS:
@if($user->role === 'admin')
- Gestionar usuarios del sistema
- Administrar moderadores
- Supervisar publicaciones
- Acceder a reportes y estadísticas
@elseif($user->role === 'moderador')
- Moderar publicaciones
- Gestionar usuarios básicos
- Revisar contenido
- Acceder a herramientas de moderación
@else
- Crear y gestionar publicaciones
- Contactar con otros usuarios
- Acceder a todas las funcionalidades de la plataforma
@endif

Si no creaste una cuenta en la Plataforma GPIS, puedes ignorar este correo de forma segura.

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al equipo de soporte.

¡Esperamos que tengas una excelente experiencia en la plataforma!

Saludos cordiales,
Equipo GPIS

---
Este es un correo automático del sistema. Por favor, no respondas a este mensaje.
© {{ date('Y') }} Plataforma GPIS. Todos los derechos reservados.
