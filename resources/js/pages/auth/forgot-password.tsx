import PasswordResetLinkController from '@/actions/App/Http/Controllers/Auth/PasswordResetLinkController';
import { login } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceAuthLayout from '@/layouts/auth/marketplace-auth-layout';
import MarketplaceLogo from '@/components/marketplace-logo';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <MarketplaceAuthLayout>
            <Head title="Recuperar Contraseña" />
            
            {/* Logo */}
            <MarketplaceLogo />
            
            {/* Welcome message */}
            <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h1>
                <p className="text-sm sm:text-base text-gray-600">Ingresa tu email para recibir un enlace de recuperación</p>
            </div>
            
            {/* Forgot password form card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h2>
                    <p className="text-gray-600 text-xs sm:text-sm">No te preocupes, te enviaremos un enlace para restablecerla</p>
                </div>

                {status && (
                    <div className="mb-4 text-center text-sm font-medium text-green-600">
                        {status}
                    </div>
                )}

                <Form {...PasswordResetLinkController.store.form()}>
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
                                        autoComplete="off"
                                        autoFocus
                                        placeholder="tu@email.com"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                    )}
                                    Enviar Enlace de Recuperación
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="mt-6 text-center">
                    <a
                        href={login()}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                    >
                        ← Volver al inicio de sesión
                    </a>
                </div>
            </div>
        </MarketplaceAuthLayout>
    );
}
