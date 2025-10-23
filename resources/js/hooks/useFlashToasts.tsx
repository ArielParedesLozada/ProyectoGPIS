import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useToast } from './useToast';

interface FlashData {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
}

interface PageProps {
    flash?: FlashData;
    [key: string]: any;
}

/**
 * Hook que detecta automáticamente los flashes de Inertia y los convierte en toasts
 * Se debe usar en cualquier página que quiera mostrar flashes como toasts
 */
export const useFlashToasts = () => {
    const { showToast } = useToast();
    const { props } = usePage<PageProps>();
    const flash = props.flash;

    useEffect(() => {
        if (!flash) return;

        // Mostrar toast de éxito
        if (flash.success) {
            showToast({
                type: 'success',
                title: 'Éxito',
                message: flash.success
            });
        }

        // Mostrar toast de error
        if (flash.error) {
            showToast({
                type: 'error',
                title: 'Error',
                message: flash.error
            });
        }

        // Mostrar toast de advertencia
        if (flash.warning) {
            showToast({
                type: 'warning',
                title: 'Advertencia',
                message: flash.warning
            });
        }

        // Mostrar toast de información
        if (flash.info) {
            showToast({
                type: 'info',
                title: 'Información',
                message: flash.info
            });
        }
    }, [flash, showToast]);
};

export default useFlashToasts;
