import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { publicationIndex, myPublications } from '@/routes';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, User, Shield, Users, UserPlus, Settings } from 'lucide-react';
import MarketplaceLogo from './marketplace-logo';
import { SharedData } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    
    const mainNavItems: NavItem[] = [
        {
            title: 'Publicaciones',
            href: publicationIndex(),
            icon: LayoutGrid,
        },
        {
            title: 'Mis Publicaciones',
            href: myPublications(),
            icon: User,
        },
    ];

    // Opciones de administración según el rol
    const adminNavItems: NavItem[] = [];
    
    if (auth.user.role === 'super_admin' || auth.user.role === 'admin') {
        adminNavItems.push(
            {
                title: 'Dashboard Admin',
                href: '/admin',
                icon: Settings,
            }
        );
    }
    
    if (auth.user.role === 'super_admin') {
        adminNavItems.push(
            {
                title: 'Administradores',
                href: '/admin/admins',
                icon: Shield,
            },
            {
                title: 'Moderadores',
                href: '/admin/moderators',
                icon: Users,
            }
        );
    } else if (auth.user.role === 'admin') {
        adminNavItems.push(
            {
                title: 'Moderadores',
                href: '/admin/moderators',
                icon: Users,
            }
        );
    }

    // Combinar elementos de navegación
    const allNavItems = [...mainNavItems, ...adminNavItems];
    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="bg-white shadow-lg border-r border-gray-300 flex flex-col h-screen"
        >
            {/* Header */}
            <SidebarHeader className="p-4 border-b border-gray-100">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                        >
                            <Link href={publicationIndex()} prefetch className='h-full w-full'>
                                <div className="flex items-center gap-2">
                                    <MarketplaceLogo />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Navigation Content */}
            <SidebarContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-gray-500 tracking-wide uppercase px-2">
                        Navegación
                    </h2>
                    <NavMain items={allNavItems} />
                </div>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="border-t border-gray-100 p-4">
                <div className="flex flex-col gap-3">
                    <NavFooter items={[]} className="mt-auto" />
                    <div className="pt-3 border-t border-gray-100">
                        <NavUser />
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
