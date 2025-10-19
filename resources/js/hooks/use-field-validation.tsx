import { useState } from 'react';

interface FieldState {
    touched: boolean;
    hasError: boolean;
    value: string;
}

export function useFieldValidation() {
    const [fields, setFields] = useState<Record<string, FieldState>>({});

    const markFieldAsTouched = (fieldName: string, value: string = '') => {
        setFields(prev => ({
            ...prev,
            [fieldName]: { 
                ...prev[fieldName], 
                touched: true,
                value: value
            }
        }));
    };

    const markSelectAsTouched = (fieldName: string, value: string = '') => {
        setFields(prev => ({
            ...prev,
            [fieldName]: { 
                ...prev[fieldName], 
                touched: true,
                value: value
            }
        }));
    };

    const validateField = (fieldName: string, value: string): string | undefined => {
        // Validaciones del lado del cliente
        switch (fieldName) {
            case 'email':
                if (!value.trim()) return 'El email es obligatorio.';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Debe ser un email válido.';
                break;
            case 'password':
                if (!value.trim()) return 'La contraseña es obligatoria.';
                if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
                break;
            case 'name':
                if (!value.trim()) return 'El nombre es obligatorio.';
                if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
                break;
            case 'surname':
                if (!value.trim()) return 'El apellido es obligatorio.';
                if (value.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres.';
                break;
            case 'phone':
                if (!value.trim()) return 'El teléfono es obligatorio.';
                if (!/^[0-9+\-\s()]+$/.test(value)) return 'El formato del teléfono no es válido.';
                break;
            case 'address':
                if (!value.trim()) return 'La dirección es obligatoria.';
                if (value.trim().length < 10) return 'La dirección debe tener al menos 10 caracteres.';
                break;
            case 'gender':
                if (!value.trim()) return 'Debes seleccionar un género.';
                break;
            case 'role':
                if (!value.trim()) return 'Debes seleccionar un rol.';
                break;
            case 'password_confirmation':
                if (!value.trim()) return 'Debes confirmar la contraseña.';
                // Aquí necesitaríamos acceso a la contraseña original para comparar
                // Por ahora solo validamos que no esté vacío
                break;
        }
        return undefined;
    };

    const shouldShowError = (fieldName: string, serverError: string | undefined, fieldValue: string = ''): boolean => {
        const field = fields[fieldName];
        if (!field?.touched) return false;
        
        // Si hay error del servidor, mostrarlo solo si el campo no está vacío
        if (serverError && fieldValue.trim() === '') return true;
        
        // Si no hay error del servidor, validar del lado del cliente
        const clientError = validateField(fieldName, fieldValue);
        return !!clientError;
    };

    const getErrorMessage = (fieldName: string, serverError: string | undefined, fieldValue: string = '', allFieldValues?: Record<string, string>): string | undefined => {
        const field = fields[fieldName];
        if (!field?.touched) return undefined;
        
        // Si hay error del servidor y el campo está vacío, mostrarlo
        if (serverError && fieldValue.trim() === '') return serverError;
        
        // Validación especial para confirmación de contraseña
        if (fieldName === 'password_confirmation' && allFieldValues) {
            if (!fieldValue.trim()) return 'Debes confirmar la contraseña.';
            if (fieldValue !== allFieldValues.password) return 'Las contraseñas no coinciden.';
        }
        
        // Si no hay error del servidor, usar validación del cliente
        return validateField(fieldName, fieldValue);
    };

    const markFieldAsValid = (fieldName: string) => {
        setFields(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], hasError: false }
        }));
    };

    const markFieldAsInvalid = (fieldName: string) => {
        setFields(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], hasError: true }
        }));
    };

    const resetField = (fieldName: string) => {
        setFields(prev => {
            const newFields = { ...prev };
            delete newFields[fieldName];
            return newFields;
        });
    };

    const resetAllFields = () => {
        setFields({});
    };

    return {
        markFieldAsTouched,
        markSelectAsTouched,
        shouldShowError,
        getErrorMessage,
        markFieldAsValid,
        markFieldAsInvalid,
        resetField,
        resetAllFields
    };
}
