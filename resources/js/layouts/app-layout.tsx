import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { ToastProvider } from '@/hooks/useToast';
import FlashToastHandler from '@/components/FlashToastHandler';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <ToastProvider>
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
        </AppLayoutTemplate>
        <FlashToastHandler />
    </ToastProvider>
);
