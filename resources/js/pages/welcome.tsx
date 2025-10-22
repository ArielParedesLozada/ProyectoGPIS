import { login, publicationIndex } from '@/routes';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    useEffect(() => {
        // Redirigir automáticamente al login o dashboard
        if (auth.user) {
            window.location.href = publicationIndex().url
        } else {
            window.location.href = login.url();
        }
    }, [auth.user]);
    // Mostrar un mensaje de carga mientras redirige
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
            <div className="text-center max-w-md">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg sm:text-xl">M</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-semibold text-blue-600">
                        Marketplace
                    </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Redirigiendo...</h1>
                <p className="text-sm sm:text-base text-gray-600">Por favor espera un momento</p>
            </div>
        </div>
    );
}