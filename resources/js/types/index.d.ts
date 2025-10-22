import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Category {
    id: number
    name: string
    banned: boolean
}

export interface Publication {
    id: number;
    code: string;
    type: "servicio" | "producto";
    status: 1 | 2;
    disponibility: boolean;
    horario: Date;
    published_at: Date;
    title: string;
    price: number;
    image?: string;
    description?: string;
    location?: string;
    user: User,
    category: Category;
    images?: Array<{
        id: number;
        image_url: string;
    }>;
}

export interface Paginated<T> {
    data: T[];
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

