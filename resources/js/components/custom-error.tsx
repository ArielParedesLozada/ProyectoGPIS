interface CustomErrorProps {
    message?: string;
    className?: string;
    show?: boolean;
}

export default function CustomError({ message, className = "", show = true }: CustomErrorProps) {
    // Solo mostrar el error si:
    // 1. Se debe mostrar (show = true)
    // 2. Hay un mensaje real del servidor
    // 3. El mensaje NO está en inglés (para evitar errores nativos de Laravel)
    if (!show || !message) return null;
    
    // Filtrar mensajes en inglés que vienen del servidor
    const englishErrorPatterns = [
        'The email field is required',
        'The password field is required',
        'The name field is required',
        'The surname field is required',
        'The phone field is required',
        'The address field is required',
        'The gender field is required',
        'The role field is required',
        'The password confirmation field is required',
        'The email must be a valid email address',
        'The password must be at least 8 characters',
        'The password confirmation does not match'
    ];
    
    // Si el mensaje está en inglés, no mostrarlo
    if (englishErrorPatterns.some(pattern => message.includes(pattern))) {
        return null;
    }

    return (
        <div className={`text-red-600 text-xs sm:text-sm mt-1 ${className}`}>
            {message}
        </div>
    );
}

// Mapeo de errores comunes en español
export const errorMessages = {
    // Errores de autenticación
    'auth.failed': 'Las credenciales no coinciden con nuestros registros.',
    'These credentials do not match our records.': 'Las credenciales no coinciden con nuestros registros.',
    'The provided credentials are incorrect.': 'Las credenciales proporcionadas son incorrectas.',
    'Invalid credentials.': 'Credenciales inválidas.',
    'auth.throttle': 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en unos minutos.',
    'auth.unauthenticated': 'Debes iniciar sesión para acceder a esta página.',
    'auth.unauthorized': 'No tienes permisos para realizar esta acción.',
    
    // Errores de validación de email
    'validation.email.required': 'El email es obligatorio.',
    'validation.email.email': 'Debe ser un email válido.',
    'validation.email.unique': 'Este email ya está registrado.',
    'validation.email.exists': 'No existe una cuenta con este email.',
    
    // Errores de validación de contraseña
    'validation.password.required': 'La contraseña es obligatoria.',
    'validation.password.min': 'La contraseña debe tener al menos 8 caracteres.',
    'validation.password.confirmed': 'Las contraseñas no coinciden.',
    'validation.password.current': 'La contraseña actual es incorrecta.',
    'The password confirmation does not match.': 'Las contraseñas no coinciden.',
    'Password confirmation does not match.': 'Las contraseñas no coinciden.',
    'The passwords do not match.': 'Las contraseñas no coinciden.',
    
    // Errores de validación de nombre
    'validation.name.required': 'El nombre es obligatorio.',
    'validation.name.min': 'El nombre debe tener al menos 2 caracteres.',
    'validation.name.max': 'El nombre no puede tener más de 50 caracteres.',
    
    // Errores de validación de apellido
    'validation.surname.required': 'El apellido es obligatorio.',
    'validation.surname.min': 'El apellido debe tener al menos 2 caracteres.',
    'validation.surname.max': 'El apellido no puede tener más de 50 caracteres.',
    
    // Errores de validación de teléfono
    'validation.phone.required': 'El teléfono es obligatorio.',
    'validation.phone.regex': 'El formato del teléfono no es válido.',
    'validation.phone.unique': 'Este teléfono ya está registrado.',
    
    // Errores de validación de dirección
    'validation.address.required': 'La dirección es obligatoria.',
    'validation.address.min': 'La dirección debe tener al menos 10 caracteres.',
    'validation.address.max': 'La dirección no puede tener más de 200 caracteres.',
    
    // Errores de validación de género
    'validation.gender.required': 'Debes seleccionar un género.',
    'validation.gender.in': 'El género seleccionado no es válido.',
    
    // Errores de validación de rol
    'validation.role.required': 'Debes seleccionar un rol.',
    'validation.role.in': 'El rol seleccionado no es válido.',
    
    // Errores generales
    'validation.required': 'Este campo es obligatorio.',
    'validation.string': 'Debe ser un texto válido.',
    'validation.numeric': 'Debe ser un número válido.',
    'validation.boolean': 'Debe ser verdadero o falso.',
    'validation.date': 'Debe ser una fecha válida.',
    'validation.url': 'Debe ser una URL válida.',
    'validation.image': 'Debe ser una imagen válida.',
    'validation.file': 'Debe ser un archivo válido.',
    
    // Errores de servidor
    'server.error': 'Ha ocurrido un error en el servidor. Inténtalo de nuevo.',
    'server.timeout': 'La solicitud ha tardado demasiado. Inténtalo de nuevo.',
    'server.not_found': 'El recurso solicitado no fue encontrado.',
    'server.forbidden': 'No tienes permisos para acceder a este recurso.',
    'server.unprocessable': 'Los datos enviados no son válidos.',
    
    // Errores de red
    'network.error': 'Error de conexión. Verifica tu internet.',
    'network.offline': 'No hay conexión a internet.',
    
    // Errores de archivo
    'file.too_large': 'El archivo es demasiado grande.',
    'file.invalid_type': 'Tipo de archivo no permitido.',
    'file.upload_failed': 'Error al subir el archivo.',
    
    // Errores de cuenta
    'account.suspended': 'Tu cuenta ha sido suspendida.',
    'account.inactive': 'Tu cuenta está inactiva.',
    'account.email_not_verified': 'Debes verificar tu email antes de continuar.',
    'account.password_reset_sent': 'Se ha enviado un enlace de recuperación a tu email.',
    'account.password_reset_failed': 'Error al enviar el enlace de recuperación.',
    'account.password_reset_invalid': 'El enlace de recuperación no es válido o ha expirado.',
};

// Función para obtener el mensaje de error en español
export function getErrorMessage(errorKey: string, fallback?: string): string | undefined {
    // Si hay un error real del servidor (fallback), traducirlo al español
    if (fallback) {
        // Primero buscar si el error directo está en nuestro mapeo
        const directTranslation = errorMessages[fallback as keyof typeof errorMessages];
        if (directTranslation) {
            return directTranslation;
        }
        
        // Luego buscar el mensaje personalizado en español basado en el errorKey
        const customMessage = errorMessages[errorKey as keyof typeof errorMessages];
        if (customMessage) {
            return customMessage;
        }
        
        // Si no hay mensaje personalizado, devolver el error original
        return fallback;
    }
    
    // Si no hay error real del servidor, no mostrar nada
    return undefined;
}

// Función para formatear errores de validación de Laravel
export function formatValidationErrors(errors: Record<string, string[]>): Record<string, string> {
    const formattedErrors: Record<string, string> = {};
    
    Object.keys(errors).forEach(field => {
        const fieldErrors = errors[field];
        if (fieldErrors && fieldErrors.length > 0) {
            // Tomar el primer error del campo
            formattedErrors[field] = fieldErrors[0];
        }
    });
    
    return formattedErrors;
}
