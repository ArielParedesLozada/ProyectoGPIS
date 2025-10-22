import AppLogoIcon from '@/components/app-logo-icon';
import MarketplaceLogo from '@/components/marketplace-logo';
import { publicationIndex } from '@/routes/index';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  name?: string;
  title?: string;
  description?: string;
}

export default function AuthSimpleLayout({
  children,
  title,
  description,
}: PropsWithChildren<AuthLayoutProps>) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header con flecha de regreso */}
      <div className="bg-white px-4 py-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Regresar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-8">
            {/* Logos y encabezado */}
            <div className="flex flex-col items-center gap-6">
              <Link
                href={publicationIndex()}
                className="flex flex-col items-center gap-2 font-medium"
                aria-label="Ir a publicaciones"
              >
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md">
                  <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                </div>
              </Link>

              <Link
                href={publicationIndex()}
                className="flex flex-col items-center gap-4"
                aria-label="Ir a publicaciones"
              >
                <MarketplaceLogo />
                <span className="sr-only">{title}</span>
              </Link>

              <div className="space-y-3 text-center">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                <p className="text-center text-base text-gray-600 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Contenido del formulario */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
