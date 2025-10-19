import { dashboard, login } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    // Si el usuario está autenticado, redirigir al dashboard
    if (auth.user) {
    return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">¡Bienvenido a Marketplace!</h1>
                            <Link
                                href={dashboard()}
                        className="inline-block bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 transition-all duration-200"
                            >
                        Ir al Dashboard
                            </Link>
                </div>
                        </div>
        );
    }

    // Si no está autenticado, redirigir al login
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">¡Bienvenido a Marketplace!</h1>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Tu plataforma de comercio digital</p>
                <Link
                    href={login()}
                    className="inline-block bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 transition-all duration-200"
                >
                    Iniciar Sesión
                </Link>
            </div>
        </div>
    );
}