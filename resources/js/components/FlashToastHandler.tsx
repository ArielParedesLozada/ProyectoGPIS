import { useFlashToasts } from '@/hooks/useFlashToasts';

/**
 * Componente que maneja automáticamente los flashes de Inertia y los convierte en toasts
 * Se debe incluir en el layout principal para que funcione en todas las páginas
 */
export const FlashToastHandler = () => {
    useFlashToasts();
    return null; // Este componente no renderiza nada visual
};

export default FlashToastHandler;
