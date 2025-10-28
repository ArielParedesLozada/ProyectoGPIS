import { Head, Link, router } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import CustomError from '@/components/custom-error';
import PasswordInput from '@/components/password-input';
import { useFieldValidation } from '@/hooks/use-field-validation';

interface ModeratorUser {
    id: number;
    cedula: string;
    name: string;
    surname: string;
    phone: string;
    address: string;
    gender: string;
    email: string;
    is_active: boolean;
}

interface EditModeratorProps {
    moderator: ModeratorUser;
}

export default function EditModerator({ moderator }: EditModeratorProps) {
    const { auth } = usePage<SharedData>().props;
    const { markFieldAsTouched, markSelectAsTouched, shouldShowError, getErrorMessage } = useFieldValidation();
    
    // Refrescar automáticamente cuando se navega a esta página
    useEffect(() => {
        router.reload({ only: ['moderator'] });
    }, []);
    
    const [fieldValues, setFieldValues] = useState({
        cedula: moderator.cedula || '',
        name: moderator.name || '',
        surname: moderator.surname || '',
        phone: moderator.phone || '',
        address: moderator.address || '',
        gender: moderator.gender || '',
        email: moderator.email || '',
        password: '',
        password_confirmation: ''
    });

    const [hasChanges, setHasChanges] = useState(false);

    // Detectar cambios en los campos editables
    useEffect(() => {
        const originalValues = {
            name: moderator.name || '',
            surname: moderator.surname || '',
            phone: moderator.phone || '',
            address: moderator.address || '',
            gender: moderator.gender || ''
        };

        const currentValues = {
            name: fieldValues.name,
            surname: fieldValues.surname,
            phone: fieldValues.phone,
            address: fieldValues.address,
            gender: fieldValues.gender
        };

        const hasFieldChanges = Object.keys(originalValues).some(
            key => originalValues[key as keyof typeof originalValues] !== currentValues[key as keyof typeof currentValues]
        );

        const hasPasswordChanges = fieldValues.password.trim() !== '' || fieldValues.password_confirmation.trim() !== '';

        setHasChanges(hasFieldChanges || hasPasswordChanges);
    }, [fieldValues, moderator]);

    const isFormValid = () => {
        const basicFieldsValid = fieldValues.name.trim() !== '' &&
                                fieldValues.surname.trim() !== '' &&
                                fieldValues.phone.trim() !== '' &&
                                fieldValues.phone.length === 10 &&
                                fieldValues.address.trim() !== '' &&
                                fieldValues.gender !== '';
        
        // Si no se está cambiando la contraseña, solo validar campos básicos y cambios
        if (fieldValues.password.trim() === '' && fieldValues.password_confirmation.trim() === '') {
            return basicFieldsValid && hasChanges;
        }
        
        // Si se está cambiando la contraseña, validar que coincidan y que haya cambios
        return basicFieldsValid &&
               hasChanges &&
               fieldValues.password.trim() !== '' &&
               fieldValues.password_confirmation.trim() !== '' &&
               fieldValues.password === fieldValues.password_confirmation;
    };

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Moderadores', href: '/admin/moderators' },
        { title: 'Editar', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Moderador" />

            <div className="space-y-6 px-6 py-6">
                {/* Back Link */}
                <div className="max-w-4xl mx-auto">
                    <Link href="/admin/moderators" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a Moderadores
                    </Link>
                </div>

                {/* Form */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card rounded-lg shadow-lg border border-border">
                        <div className="px-6 py-6 border-b border-border">
                            <h1 className="text-2xl font-bold text-foreground">Editar Moderador</h1>
                        </div>
                        <div className="px-6 py-6">
                            <h2 className="text-lg font-semibold text-foreground mb-6">Información del Moderador</h2>
                            <Form
                                action={`/admin/moderators/${moderator.id}`}
                                method="patch"
                                className="space-y-8"
                            >
                            {({ processing, errors }) => (
                                <>
                                    {/* Campos ocultos para datos bloqueados */}
                                    <input type="hidden" name="cedula" value={fieldValues.cedula} />
                                    <input type="hidden" name="email" value={fieldValues.email} />
                                    
                                    {errors.general && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <p className="text-red-600 text-sm">{errors.general}</p>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        {/* Cédula */}
                                        <div>
                                            <Label htmlFor="cedula" className="text-sm font-medium text-foreground mb-2 block">
                                                Cédula *
                                            </Label>
                                            <Input
                                                id="cedula"
                                                name="cedula"
                                                type="text"
                                                value={fieldValues.cedula}
                                                disabled
                                                className="w-full bg-muted cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Nombre y Apellido */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="name" className="text-sm font-medium text-foreground mb-2 block">
                                                    Nombre *
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    type="text"
                                                    placeholder="Juan"
                                                    value={fieldValues.name}
                                                    onChange={(e) => setFieldValues(prev => ({ ...prev, name: e.target.value }))}
                                                    onBlur={(e) => markFieldAsTouched('name', e.target.value)}
                                                    className="w-full"
                                                />
                                                <CustomError
                                                    message={getErrorMessage('name', errors.name, fieldValues.name)}
                                                    show={shouldShowError('name', errors.name, fieldValues.name)}
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="surname" className="text-sm font-medium text-foreground mb-2 block">
                                                    Apellido *
                                                </Label>
                                                <Input
                                                    id="surname"
                                                    name="surname"
                                                    type="text"
                                                    placeholder="Pérez"
                                                    value={fieldValues.surname}
                                                    onChange={(e) => setFieldValues(prev => ({ ...prev, surname: e.target.value }))}
                                                    onBlur={(e) => markFieldAsTouched('surname', e.target.value)}
                                                    className="w-full"
                                                />
                                                <CustomError
                                                    message={getErrorMessage('surname', errors.surname, fieldValues.surname)}
                                                    show={shouldShowError('surname', errors.surname, fieldValues.surname)}
                                                />
                                            </div>
                                        </div>

                                        {/* Teléfono y Dirección */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="phone" className="text-sm font-medium text-foreground mb-2 block">
                                                    Teléfono *
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={10}
                                                    placeholder="0900112266"
                                                    value={fieldValues.phone}
                                                    onChange={(e) => {
                                                        const onlyNumbers = e.target.value.replace(/\D/g, '');
                                                        if (onlyNumbers.length <= 10) {
                                                            setFieldValues(prev => ({ ...prev, phone: onlyNumbers }));
                                                        }
                                                    }}
                                                    onBlur={(e) => markFieldAsTouched('phone', e.target.value)}
                                                    className="w-full"
                                                />
                                                <CustomError
                                                    message={getErrorMessage('phone', errors.phone, fieldValues.phone)}
                                                    show={shouldShowError('phone', errors.phone, fieldValues.phone)}
                                                />
                                                {fieldValues.phone.length > 0 && fieldValues.phone.length !== 10 && (
                                                    <p className="text-red-600 text-xs mt-1">El teléfono debe tener exactamente 10 dígitos</p>
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor="address" className="text-sm font-medium text-foreground mb-2 block">
                                                    Dirección *
                                                </Label>
                                                <Input
                                                    id="address"
                                                    name="address"
                                                    type="text"
                                                    placeholder="Calle Principal 123, Ciudad"
                                                    value={fieldValues.address}
                                                    onChange={(e) => setFieldValues(prev => ({ ...prev, address: e.target.value }))}
                                                    onBlur={(e) => markFieldAsTouched('address', e.target.value)}
                                                    className="w-full"
                                                />
                                                <CustomError
                                                    message={getErrorMessage('address', errors.address, fieldValues.address)}
                                                    show={shouldShowError('address', errors.address, fieldValues.address)}
                                                />
                                            </div>
                                        </div>

                                        {/* Género */}
                                        <div>
                                            <Label htmlFor="gender" className="text-sm font-medium text-foreground mb-2 block">
                                                Género *
                                            </Label>
                                            <Select
                                                name="gender"
                                                value={fieldValues.gender}
                                                onValueChange={(value) => {
                                                    setFieldValues(prev => ({ ...prev, gender: value }));
                                                    markSelectAsTouched('gender', value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Selecciona el género" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="hombre">Hombre</SelectItem>
                                                    <SelectItem value="mujer">Mujer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <CustomError
                                                message={getErrorMessage('gender', errors.gender, fieldValues.gender)}
                                                show={shouldShowError('gender', errors.gender, fieldValues.gender)}
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <Label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                                                Email *
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={fieldValues.email}
                                                disabled
                                                className="w-full bg-muted cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Contraseña (opcional) */}
                                        <div className="border-t pt-6">
                                            <h3 className="text-md font-semibold text-foreground mb-4">Cambiar Contraseña (Opcional)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <Label htmlFor="password" className="text-sm font-medium text-foreground mb-2 block">
                                                        Nueva Contraseña
                                                    </Label>
                                                    <PasswordInput
                                                        id="password"
                                                        name="password"
                                                        placeholder="Dejar vacío para mantener la actual"
                                                        value={fieldValues.password}
                                                        onChange={(e) => setFieldValues(prev => ({ ...prev, password: e.target.value }))}
                                                        onBlur={(e) => markFieldAsTouched('password', e.target.value)}
                                                        className="w-full"
                                                    />
                                                    <CustomError
                                                        message={getErrorMessage('password', errors.password, fieldValues.password)}
                                                        show={shouldShowError('password', errors.password, fieldValues.password)}
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="password_confirmation" className="text-sm font-medium text-foreground mb-2 block">
                                                        Confirmar Nueva Contraseña
                                                    </Label>
                                                    <PasswordInput
                                                        id="password_confirmation"
                                                        name="password_confirmation"
                                                        placeholder="Repite la nueva contraseña"
                                                        value={fieldValues.password_confirmation}
                                                        onChange={(e) => setFieldValues(prev => ({ ...prev, password_confirmation: e.target.value }))}
                                                        onBlur={(e) => markFieldAsTouched('password_confirmation', e.target.value)}
                                                        className="w-full"
                                                    />
                                                    <CustomError
                                                        message={getErrorMessage('password_confirmation', errors.password_confirmation, fieldValues.password_confirmation, fieldValues)}
                                                        show={shouldShowError('password_confirmation', errors.password_confirmation, fieldValues.password_confirmation)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end space-x-4 pt-8 border-t border-border">
                                        <Button type="button" variant="outline" size="lg" asChild>
                                            <Link href="/admin/moderators">Cancelar</Link>
                                        </Button>
                                        <Button type="submit" size="lg" disabled={processing || !isFormValid()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                            {processing && <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />}
                                            {hasChanges ? 'Actualizar Moderador' : 'Sin cambios para guardar'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
