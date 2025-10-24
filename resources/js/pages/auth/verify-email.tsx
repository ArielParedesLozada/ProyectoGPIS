import EmailVerificationNotificationController from '@/actions/App/Http/Controllers/Auth/EmailVerificationNotificationController';
import { Form, Head, router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
  return (
    <AuthLayout
      title="Verificar email"
      description="Por favor, verifica tu dirección de email haciendo clic en el enlace que acabamos de enviarte."
    >
      <Head title="Verificación de Email" />

      {status === 'verification-link-sent' && (
        <div className="mb-4 text-center text-sm font-medium text-green-600">
          Se ha enviado un nuevo enlace de verificación a la dirección de email que proporcionaste durante el registro.
        </div>
      )}

      <div className="space-y-6 text-center">
        <Form {...EmailVerificationNotificationController.store.form()}>
          {({ processing }) => (
            <Button disabled={processing} variant="secondary">
              {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Reenviar correo de verificación
            </Button>
          )}
        </Form>

        {/* 👇 logout usando router.post directamente */}
        <Button 
          type="button" 
          variant="link" 
          className="mx-auto block text-sm p-0"
          onClick={() => router.post('/logout')}
        >
          Cerrar sesión
        </Button>
      </div>
    </AuthLayout>
  );
}
