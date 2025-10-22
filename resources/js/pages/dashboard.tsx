import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-8 overflow-x-auto rounded-xl p-4">
                {/* Logo M prominente en el centro */}
                <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="w-32 h-32 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                        <span className="text-white font-bold text-6xl">M</span>
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Marketplace</h1>
                        <p className="text-gray-600">Tu plataforma de productos favorita</p>
                    </div>
                </div>
                
                {/* Grid de productos simplificado */}
                <div className="w-full max-w-6xl">
                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
