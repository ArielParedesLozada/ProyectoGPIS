import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

const isCI = process.env.CI === 'true';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            // 👇 aquí está la magia: en CI usamos docker, en local php normal
            command: isCI
                ? 'docker exec -w /var/www/html php83_app php artisan wayfinder:generate --with-form'
                : 'php artisan wayfinder:generate --with-form',
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
