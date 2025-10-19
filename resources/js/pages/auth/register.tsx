import RegisteredUserController from '@/actions/App/Http/Controllers/Auth/RegisteredUserController';
import { login } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/password-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MarketplaceAuthLayout from '@/layouts/auth/marketplace-auth-layout';
import MarketplaceLogo from '@/components/marketplace-logo';
import AuthTabs from '@/components/auth-tabs';

export default function Register() {
    return (
        <MarketplaceAuthLayout>
            <Head title="Registrarse" />
            
            {/* Logo */}
            <MarketplaceLogo />
            
            {/* Welcome message */}
            <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bienvenido</h1>
                <p className="text-sm sm:text-base text-gray-600">Inicia sesión o crea una cuenta para continuar</p>
            </div>
            
            {/* Auth tabs */}
            <AuthTabs activeTab="register" />
            
            {/* Register form card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Crear Cuenta</h2>
                    <p className="text-gray-600 text-xs sm:text-sm">Completa el formulario para registrarte</p>
                </div>

                <Form
                    {...RegisteredUserController.store.form()}
                    resetOnSuccess={['password', 'password_confirmation']}
                    disableWhileProcessing
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-3 sm:space-y-4">
                                {/* Grid para campos en pantallas grandes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Nombre */}
                                    <div>
                                        <Label htmlFor="name" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Nombre
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="given-name"
                                            name="name"
                                            placeholder="Juan"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    {/* Apellido */}
                                    <div>
                                        <Label htmlFor="surname" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Apellido
                                        </Label>
                                        <Input
                                            id="surname"
                                            type="text"
                                            required
                                            tabIndex={2}
                                            autoComplete="family-name"
                                            name="surname"
                                            placeholder="Pérez"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        />
                                        <InputError message={errors.surname} />
                                    </div>
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <Label htmlFor="phone" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        tabIndex={3}
                                        autoComplete="tel"
                                        name="phone"
                                        placeholder="+34 123 456 789"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                {/* Dirección */}
                                <div>
                                    <Label htmlFor="address" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                        Dirección
                                    </Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        required
                                        tabIndex={4}
                                        autoComplete="street-address"
                                        name="address"
                                        placeholder="Calle Principal 123, Ciudad"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                    />
                                    <InputError message={errors.address} />
                                </div>

                                {/* Grid para selectores en pantallas grandes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Género */}
                                    <div>
                                        <Label htmlFor="gender" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Género
                                        </Label>
                                        <Select name="gender" required>
                                            <SelectTrigger tabIndex={5} className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                                                <SelectValue placeholder="Selecciona tu género" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hombre">Hombre</SelectItem>
                                                <SelectItem value="mujer">Mujer</SelectItem>
                                                <SelectItem value="otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.gender} />
                                    </div>

                                    {/* Rol */}
                                    <div>
                                        <Label htmlFor="role" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Rol
                                        </Label>
                                        <Select name="role" required>
                                            <SelectTrigger tabIndex={6} className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                                                <SelectValue placeholder="Selecciona tu rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">Usuario</SelectItem>
                                                <SelectItem value="admin">Administrador</SelectItem>
                                                <SelectItem value="seller">Vendedor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.role} />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={7}
                                        autoComplete="email"
                                        name="email"
                                        placeholder="tu@email.com"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                {/* Grid para contraseñas en pantallas grandes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Contraseña */}
                                    <div>
                                        <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Contraseña
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            required
                                            tabIndex={8}
                                            autoComplete="new-password"
                                            name="password"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    {/* Confirmar Contraseña */}
                                    <div>
                                        <Label htmlFor="password_confirmation" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Confirmar Contraseña
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            required
                                            tabIndex={9}
                                            autoComplete="new-password"
                                            name="password_confirmation"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        />
                                        <InputError message={errors.password_confirmation} />
                                    </div>
                                </div>

                                {/* Terms and Privacy */}
                                <div className="text-xs sm:text-sm text-gray-600">
                                    Al registrarte, aceptas nuestros{' '}
                                    <a href="#" className="text-blue-600 hover:text-blue-800">
                                        Términos de Servicio
                                    </a>{' '}
                                    y{' '}
                                    <a href="#" className="text-blue-600 hover:text-blue-800">
                                        Política de Privacidad
                                    </a>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 transition-all duration-200"
                                    tabIndex={10}
                                    data-test="register-user-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                    )}
                                    Crear Cuenta
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </MarketplaceAuthLayout>
    );
}
