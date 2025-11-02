import RegisteredUserController from '@/actions/App/Http/Controllers/Auth/RegisteredUserController';
import { login } from '@/routes/index';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import CustomError from '@/components/custom-error';
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
import TextLink from '@/components/text-link';

export default function Register() {
    const { markFieldAsTouched, markSelectAsTouched, shouldShowError, getErrorMessage } = useFieldValidation();
    const [fieldValues, setFieldValues] = useState({
        cedula: '',
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
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Bienvenido</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Inicia sesión o crea una cuenta para continuar</p>
            </div>

            {/* Auth tabs */}
            <AuthTabs activeTab="register" />

            {/* Register form card */}
            <div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-border">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">Crear Cuenta</h2>
                    <p className="text-muted-foreground text-xs sm:text-sm">Completa el formulario para registrarte</p>
                </div>

                <Form
                    action={RegisteredUserController.store().url}
                    method={RegisteredUserController.store().method}
                    resetOnSuccess={['password', 'password_confirmation']}
                    disableWhileProcessing
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-3 sm:space-y-4">
                                {errors.general && (
                                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                                        <p className="text-destructive text-md">Ocurrio un error inesperado al registrar al usuario</p>
                                        <p className='text-destructive text-sm'>{errors.general}</p>
                                    </div>
                                )}

                                {/* Grid para campos en pantallas grandes */}
                                <div>
                                    <Label htmlFor="cedula" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                        Cédula
                                    </Label>
                                    <Input
                                        id="cedula"
                                        name="cedula"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        tabIndex={1}
                                        placeholder="1234567890"
                                        value={fieldValues.cedula}
                                        onChange={(e) => {
                                            const onlyNumbers = e.target.value.replace(/\D/g, ''); // elimina letras
                                            if (onlyNumbers.length <= 10) {
                                                setFieldValues(prev => ({ ...prev, cedula: onlyNumbers }));
                                            }
                                        }}
                                        onBlur={(e) => markFieldAsTouched('cedula', e.target.value)}
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                    />
                                    <CustomError
                                        message={getErrorMessage('cedula', errors.cedula, fieldValues.cedula)}
                                        show={shouldShowError('cedula', errors.cedula, fieldValues.cedula)}
                                    />
                                    {errors.cedula && (
                                        <CustomError message={errors.cedula} show={!!errors.cedula} />
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Nombre */}
                                    <div>
                                        <Label htmlFor="name" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                            Nombre
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            autoFocus
                                            tabIndex={2}
                                            autoComplete="given-name"
                                            name="name"
                                            placeholder="Juan"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                            value={fieldValues.name}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, name: e.target.value }))}
                                            onBlur={(e) => markFieldAsTouched('name', e.target.value)}
                                        />
                                        <CustomError
                                            message={getErrorMessage('name', errors.name, fieldValues.name)}
                                            show={shouldShowError('name', errors.name, fieldValues.name)}
                                        />
                                        {errors.name && (
                                            <CustomError message={errors.name} show={!!errors.name} />
                                        )}
                                    </div>

                                    {/* Apellido */}
                                    <div>
                                        <Label htmlFor="surname" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                            Apellido
                                        </Label>
                                        <Input
                                            id="surname"
                                            type="text"
                                            tabIndex={3}
                                            autoComplete="family-name"
                                            name="surname"
                                            placeholder="Pérez"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                            value={fieldValues.surname}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, surname: e.target.value }))}
                                            onBlur={(e) => markFieldAsTouched('surname', e.target.value)}
                                        />
                                        <CustomError
                                            message={getErrorMessage('surname', errors.surname, fieldValues.surname)}
                                            show={shouldShowError('surname', errors.surname, fieldValues.surname)}
                                        />
                                        {errors.surname && (
                                            <CustomError message={errors.surname} show={!!errors.surname} />
                                        )}
                                    </div>
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <Label htmlFor="phone" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        tabIndex={4}
                                        placeholder="0900112266"
                                        value={fieldValues.phone}
                                        onChange={(e) => {
                                            const onlyNumbers = e.target.value.replace(/\D/g, '');
                                            if (onlyNumbers.length <= 10) {
                                                setFieldValues(prev => ({ ...prev, phone: onlyNumbers }));
                                            }
                                        }}
                                        onBlur={(e) => markFieldAsTouched('phone', e.target.value)}
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                    />
                                    <CustomError
                                        message={getErrorMessage('phone', errors.phone, fieldValues.phone)}
                                        show={shouldShowError('phone', errors.phone, fieldValues.phone)}
                                    />
                                    {errors.phone && (
                                        <CustomError message={errors.phone} show={!!errors.phone} />
                                    )}
                                </div>

                                {/* Dirección */}
                                <div>
                                    <Label htmlFor="address" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                        Dirección
                                    </Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        tabIndex={5}
                                        autoComplete="street-address"
                                        name="address"
                                        placeholder="Calle Principal 123, Ciudad"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                        value={fieldValues.address}
                                        onChange={(e) => setFieldValues(prev => ({ ...prev, address: e.target.value }))}
                                        onBlur={(e) => markFieldAsTouched('address', e.target.value)}
                                    />
                                    <CustomError
                                        message={getErrorMessage('address', errors.address, fieldValues.address)}
                                        show={shouldShowError('address', errors.address, fieldValues.address)}
                                    />
                                    {errors.address && (
                                        <CustomError message={errors.address} show={!!errors.address} />
                                    )}
                                </div>

                                {/* Grid para selectores en pantallas grandes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Género */}
                                    <div>
                                        <Label htmlFor="gender" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
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
                                                tabIndex={6}
                                                className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                                onBlur={() => markSelectAsTouched('gender', fieldValues.gender)}
                                            >
                                                <SelectValue placeholder="Selecciona tu género" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border border-border rounded-lg shadow-lg">
                                                <SelectItem value="hombre" className="text-popover-foreground hover:bg-accent">Hombre</SelectItem>
                                                <SelectItem value="mujer" className="text-popover-foreground hover:bg-accent">Mujer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <CustomError
                                            message={getErrorMessage('gender', errors.gender, fieldValues.gender)}
                                            show={shouldShowError('gender', errors.gender, fieldValues.gender)}
                                        />
                                        {errors.gender && (
                                            <CustomError message={errors.gender} show={!!errors.gender} />
                                        )}
                                    </div>

                                    {/* Rol */}
                                    <div>
                                        <Label htmlFor="role" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
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
                                                tabIndex={7}
                                                className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                                onBlur={() => markSelectAsTouched('role', fieldValues.role)}
                                            >
                                                <SelectValue placeholder="Selecciona tu rol" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border border-border rounded-lg shadow-lg">
                                                <SelectItem value="comprador" className="text-popover-foreground hover:bg-accent">Comprador/Visualizador</SelectItem>
                                                <SelectItem value="vendedor" className="text-popover-foreground hover:bg-accent">Vendedor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <CustomError
                                            message={getErrorMessage('role', errors.role, fieldValues.role)}
                                            show={shouldShowError('role', errors.role, fieldValues.role)}
                                        />
                                        {errors.role && (
                                            <CustomError message={errors.role} show={!!errors.role} />
                                        )}
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        tabIndex={8}
                                        autoComplete="email"
                                        name="email"
                                        placeholder="tu@email.com"
                                        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                        value={fieldValues.email}
                                        onChange={(e) => setFieldValues(prev => ({ ...prev, email: e.target.value }))}
                                        onBlur={(e) => markFieldAsTouched('email', e.target.value)}
                                    />
                                    <CustomError
                                        message={getErrorMessage('email', errors.email, fieldValues.email)}
                                        show={shouldShowError('email', errors.email, fieldValues.email)}
                                    />
                                    {errors.email && (
                                        <CustomError message={errors.email} show={!!errors.email} />
                                    )}
                                </div>


                                {/* Grid para contraseñas en pantallas grandes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Contraseña */}
                                    <div>
                                        <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                            Contraseña
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            tabIndex={9}
                                            autoComplete="new-password"
                                            name="password"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                            value={fieldValues.password}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, password: e.target.value }))}
                                            onBlur={(e) => {
                                                markFieldAsTouched('password', e.target.value);
                                            }} />
                                        <CustomError
                                            message={getErrorMessage('password', errors.password, fieldValues.password)}
                                            show={shouldShowError('password', errors.password, fieldValues.password)}
                                        />
                                        {errors.password && (
                                            <CustomError message={errors.password} show={!!errors.password} />
                                        )}

                                    </div>

                                    {/* Confirmar Contraseña */}
                                    <div>
                                        <Label htmlFor="password_confirmation" className="text-xs sm:text-sm font-medium text-foreground mb-2 block">
                                            Confirmar Contraseña
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            tabIndex={10}
                                            autoComplete="new-password"
                                            name="password_confirmation"
                                            className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground bg-background"
                                            value={fieldValues.password_confirmation}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, password_confirmation: e.target.value }))}
                                            onBlur={(e) => {
                                                markFieldAsTouched('password_confirmation', e.target.value);
                                            }} />
                                        <CustomError
                                            message={getErrorMessage('password_confirmation', errors.password_confirmation, fieldValues.password_confirmation, fieldValues)}
                                            show={shouldShowError('password_confirmation', errors.password_confirmation, fieldValues.password_confirmation)}
                                        />
                                        {errors.password && (
                                            <CustomError message={errors.password} show={!!errors.password} />
                                        )}
                                    </div>
                                </div>

                                {/* Terms and Privacy */}
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Al registrarte, aceptas nuestros{' '}
                                    <a href="#" className="text-primary hover:text-primary/80">
                                        Términos de Servicio
                                    </a>{' '}
                                    y{' '}
                                    <a href="#" className="text-primary hover:text-primary/80">
                                        Política de Privacidad
                                    </a>
                                </div>
                                <Button
                                    type="submit"
                                    className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                    tabIndex={11}
                                    data-test="register-user-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}
                                    Crear cuenta
                                </Button>
                            </div>

                        </>
                    )}
                </Form>
            </div>
        </MarketplaceAuthLayout>
    );
}
