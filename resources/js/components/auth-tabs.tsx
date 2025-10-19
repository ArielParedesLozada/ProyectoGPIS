import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

interface AuthTabsProps {
    activeTab: 'login' | 'register';
}

export default function AuthTabs({ activeTab }: AuthTabsProps) {
    return (
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6 sm:mb-8">
            <Link
                href="/login"
                className={cn(
                    "flex-1 text-center py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                    activeTab === 'login'
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                )}
            >
                Iniciar Sesión
            </Link>
            <Link
                href="/register"
                className={cn(
                    "flex-1 text-center py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                    activeTab === 'register'
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                )}
            >
                Registrarse
            </Link>
        </div>
    );
}
