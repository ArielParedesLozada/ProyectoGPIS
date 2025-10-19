import RegisteredUserController from '@/actions/App/Http/Controllers/Auth/RegisteredUserController';
import { login } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import CustomError, { getErrorMessage } from '@/components/custom-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/password-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MarketplaceAuthLayout from '@/layouts/auth/marketplace-auth-layout';
import MarketplaceLogo from '@/components/marketplace-logo';
import AuthTabs from '@/components/auth-tabs';
import { useFieldValidation } from '@/hooks/use-field-validation';
import { useState } from 'react';

export default function Register() {
    const { markFieldAsTouched, markSelectAsTouched, shouldShowError, getErrorMessage } = useFieldValidation();
    const [fieldValues, setFieldValues] = useState({ 
        name: '', 
        surname: '', 
        phone: '', 
        address: '', 
        gender: '', 
        role: '', 
        email: '', 
        password: '', 
        password_confirmation: '' 
    });

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
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="given-name"
                                            name="name"
                                            placeholder="Juan"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                            value={fieldValues.name}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, name: e.target.value }))}
                                            onBlur={(e) => markFieldAsTouched('name', e.target.value)}
                                        />
                                        <CustomError 
                                            message={getErrorMessage('name', errors.name, fieldValues.name)} 
                                            show={shouldShowError('name', errors.name, fieldValues.name)}
                                        />
                                    </div>

                                    {/* Apellido */}
                                    <div>
                                        <Label htmlFor="surname" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Apellido
                                        </Label>
                                        <Input
                                            id="surname"
                                            type="text"
                                            tabIndex={2}
                                            autoComplete="family-name"
                                            name="surname"
                                            placeholder="Pérez"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                            value={fieldValues.surname}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, surname: e.target.value }))}
                                            onBlur={(e) => markFieldAsTouched('surname', e.target.value)}
                                        />
                                        <CustomError 
                                            message={getErrorMessage('surname', errors.surname, fieldValues.surname)} 
                                            show={shouldShowError('surname', errors.surname, fieldValues.surname)}
                                        />
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
                                        tabIndex={3}
                                        autoComplete="tel"
                                        name="phone"
                                        placeholder="0900112266"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        value={fieldValues.phone}
                                        onChange={(e) => setFieldValues(prev => ({ ...prev, phone: e.target.value }))}
                                        onBlur={(e) => markFieldAsTouched('phone', e.target.value)}
                                    />
                                    <CustomError 
                                        message={getErrorMessage('phone', errors.phone, fieldValues.phone)} 
                                        show={shouldShowError('phone', errors.phone, fieldValues.phone)}
                                    />
                                </div>

                                {/* Dirección */}
                                <div>
                                    <Label htmlFor="address" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                        Dirección
                                    </Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        tabIndex={4}
                                        autoComplete="street-address"
                                        name="address"
                                        placeholder="Calle Principal 123, Ciudad"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        value={fieldValues.address}
                                        onChange={(e) => setFieldValues(prev => ({ ...prev, address: e.target.value }))}
                                        onBlur={(e) => markFieldAsTouched('address', e.target.value)}
                                    />
                                    <CustomError 
                                        message={getErrorMessage('address', errors.address, fieldValues.address)} 
                                        show={shouldShowError('address', errors.address, fieldValues.address)}
                                    />
                                </div>

                                {/* Grid para selectores en pantallas grandes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Género */}
                                    <div>
                                        <Label htmlFor="gender" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Género
                                        </Label>
                                        <Select 
                                            name="gender"
                                            value={fieldValues.gender}
                                            onValueChange={(value) => {
                                                setFieldValues(prev => ({ ...prev, gender: value }));
                                                markSelectAsTouched('gender', value);
                                            }}
                                        >
                                            <SelectTrigger 
                                                tabIndex={5} 
                                                className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                                onBlur={() => markSelectAsTouched('gender', fieldValues.gender)}
                                            >
                                                <SelectValue placeholder="Selecciona tu género" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border border-gray-300 rounded-lg shadow-lg">
                                                <SelectItem value="hombre" className="text-gray-900 hover:bg-gray-100">Hombre</SelectItem>
                                                <SelectItem value="mujer" className="text-gray-900 hover:bg-gray-100">Mujer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <CustomError 
                                            message={getErrorMessage('gender', errors.gender, fieldValues.gender)} 
                                            show={shouldShowError('gender', errors.gender, fieldValues.gender)}
                                        />
                                    </div>

                                    {/* Rol */}
                                    <div>
                                        <Label htmlFor="role" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Rol
                                        </Label>
                                        <Select 
                                            name="role"
                                            value={fieldValues.role}
                                            onValueChange={(value) => {
                                                setFieldValues(prev => ({ ...prev, role: value }));
                                                markSelectAsTouched('role', value);
                                            }}
                                        >
                                            <SelectTrigger 
                                                tabIndex={6} 
                                                className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                                onBlur={() => markSelectAsTouched('role', fieldValues.role)}
                                            >
                                                <SelectValue placeholder="Selecciona tu rol" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border border-gray-300 rounded-lg shadow-lg">
                                                <SelectItem value="buyer" className="text-gray-900 hover:bg-gray-100">Comprador/Visualizador</SelectItem>
                                                <SelectItem value="seller" className="text-gray-900 hover:bg-gray-100">Vendedor</SelectItem>
                                                <SelectItem value="moderator" className="text-gray-900 hover:bg-gray-100">Moderador</SelectItem>
                                                <SelectItem value="admin" className="text-gray-900 hover:bg-gray-100">Administrador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <CustomError 
                                            message={getErrorMessage('role', errors.role, fieldValues.role)} 
                                            show={shouldShowError('role', errors.role, fieldValues.role)}
                                        />
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
                                        tabIndex={7}
                                        autoComplete="email"
                                        name="email"
                                        placeholder="tu@email.com"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                        value={fieldValues.email}
                                        onChange={(e) => setFieldValues(prev => ({ ...prev, email: e.target.value }))}
                                        onBlur={(e) => markFieldAsTouched('email', e.target.value)}
                                    />
                                    <CustomError 
                                        message={getErrorMessage('email', errors.email, fieldValues.email)} 
                                        show={shouldShowError('email', errors.email, fieldValues.email)}
                                    />
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
                                            tabIndex={8}
                                            autoComplete="new-password"
                                            name="password"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                            value={fieldValues.password}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, password: e.target.value }))}
                                            onBlur={(e) => markFieldAsTouched('password', e.target.value)}
                                        />
                                        <CustomError 
                                            message={getErrorMessage('password', errors.password, fieldValues.password)} 
                                            show={shouldShowError('password', errors.password, fieldValues.password)}
                                        />
                                    </div>

                                    {/* Confirmar Contraseña */}
                                    <div>
                                        <Label htmlFor="password_confirmation" className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                                            Confirmar Contraseña
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            tabIndex={9}
                                            autoComplete="new-password"
                                            name="password_confirmation"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                                            value={fieldValues.password_confirmation}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, password_confirmation: e.target.value }))}
                                            onBlur={(e) => markFieldAsTouched('password_confirmation', e.target.value)}
                                        />
                                        <CustomError 
                                            message={getErrorMessage('password_confirmation', errors.password_confirmation, fieldValues.password_confirmation, fieldValues)} 
                                            show={shouldShowError('password_confirmation', errors.password_confirmation, fieldValues.password_confirmation)}
                                        />
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
                                className="mt-2 w-full"
                                tabIndex={5}
                                data-test="register-user-button"
                            >
                                {processing && (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                )}
                                Create account
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
            </div>
        </MarketplaceAuthLayout>
    );
}
