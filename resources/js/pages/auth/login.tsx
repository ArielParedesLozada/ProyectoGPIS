import AuthenticatedSessionController from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/password-input';
import MarketplaceAuthLayout from '@/layouts/auth/marketplace-auth-layout';
import MarketplaceLogo from '@/components/marketplace-logo';
import AuthTabs from '@/components/auth-tabs';
import { request } from '@/routes/password';
import { Form, Head, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    return (
        <MarketplaceAuthLayout>
            <Head title="Iniciar Sesión" />
            
            {/* Logo */}
            <MarketplaceLogo />
            
            {/* Welcome message */}
            <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bienvenido</h1>
                <p className="text-sm sm:text-base text-gray-600">Inicia sesión o crea una cuenta para continuar</p>
            </div>
            
            {/* Auth tabs */}
            <AuthTabs activeTab="login" />
            
            {/* Login form card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Iniciar Sesión</h2>
                    <p className="text-gray-600 text-xs sm:text-sm">Ingresa tus credenciales para acceder a tu cuenta</p>
                </div>

                <Form
                    {...AuthenticatedSessionController.store.form()}
                    resetOnSuccess={['password']}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="tu@email.com"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div>
                                    <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                        Contraseña
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                {canResetPassword && (
                                    <div className="text-left">
                                        <Link
                                            href={request()}
                                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200"
                                    tabIndex={3}
                                    disabled={processing}
                                    data-test="login-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                    )}
                                    Iniciar Sesión
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                {status && (
                    <div className="mt-4 text-center text-sm font-medium text-green-600">
                        {status}
                    </div>
                )}
            </div>
        </MarketplaceAuthLayout>
    );
}
