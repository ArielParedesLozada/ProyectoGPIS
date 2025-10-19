import RegisteredUserController from '@/actions/App/Http/Controllers/Auth/RegisteredUserController';
import { login } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Register() {
    return (
        <AuthLayout
            title="Create an account"
            description="Enter your details below to create your account"
        >
            <Head title="Register" />
            <Form
                {...RegisteredUserController.store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            {/* Nombre */}
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="given-name"
                                    name="name"
                                    placeholder="Tu nombre"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            {/* Apellido */}
                            <div className="grid gap-2">
                                <Label htmlFor="surname">Apellido</Label>
                                <Input
                                    id="surname"
                                    type="text"
                                    required
                                    tabIndex={2}
                                    autoComplete="family-name"
                                    name="surname"
                                    placeholder="Tu apellido"
                                />
                                <InputError
                                    message={errors.surname}
                                    className="mt-2"
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    required
                                    tabIndex={3}
                                    autoComplete="tel"
                                    name="phone"
                                    placeholder="+34 123 456 789"
                                />
                                <InputError
                                    message={errors.phone}
                                    className="mt-2"
                                />
                            </div>

                            {/* Dirección */}
                            <div className="grid gap-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    type="text"
                                    required
                                    tabIndex={4}
                                    autoComplete="street-address"
                                    name="address"
                                    placeholder="Tu dirección completa"
                                />
                                <InputError
                                    message={errors.address}
                                    className="mt-2"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="gender">Género</Label>
                                <Select
                                    required
                                    name="gender"
                                >
                                    <SelectTrigger tabIndex={5}>
                                        <SelectValue placeholder="Selecciona tu género" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hombre">Hombre</SelectItem>
                                        <SelectItem value="mujer">Mujer</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={errors.gender}
                                    className="mt-2"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={6}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    tabIndex={7}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    required
                                    tabIndex={8}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={9}
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
                            <TextLink href={login()} tabIndex={10}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
