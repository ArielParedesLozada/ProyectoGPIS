import CustomError, { getErrorMessage } from '@/components/custom-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/password/confirm';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

export default function ConfirmPassword() {
    return (
        <AuthLayout
            title="Confirma tu contraseña"
            description="Esta es un área segura de la aplicación. Por favor confirma tu contraseña antes de continuar."
        >
            <Head title="Confirmar contraseña" />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Contraseña"
                                autoComplete="current-password"
                                autoFocus
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                            />
                            <CustomError message={getErrorMessage('validation.password.required', errors.password)} />
                        </div>

                        <div className="pt-4">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && (
                                    <LoaderCircle className="h-5 w-5 animate-spin mr-2" />
                                )}
                                Confirmar contraseña
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </AuthLayout>
    );
}
