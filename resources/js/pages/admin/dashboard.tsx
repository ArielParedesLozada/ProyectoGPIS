import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, UserPlus, Settings, Activity, TrendingUp } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AdminDashboardProps {
    stats: {
        totalAdmins: number;
        activeAdmins: number;
        totalModerators: number;
        activeModerators: number;
        recentActivity: Array<{
            id: number;
            action: string;
            user: string;
            timestamp: string;
        }>;
    };
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
    const { auth } = usePage<SharedData>().props;

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
    ];

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Hace un momento';
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
        if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} horas`;
        return `Hace ${Math.floor(diffInMinutes / 1440)} días`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard de Administración" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Administración</h1>
                        <p className="text-gray-600">
                            Bienvenido, {auth.user.name}. Gestiona el sistema desde aquí.
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <Badge variant="outline" className="text-sm">
                            {auth.user.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
                        </Badge>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {auth.user.role === 'super_admin' && (
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Administradores
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalAdmins}</div>
                                <p className="text-xs text-gray-500">
                                    {stats.activeAdmins} activos
                                </p>
                                <Button size="sm" className="mt-2" asChild>
                                    <Link href="/admin/admins">Gestionar</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                Moderadores
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalModerators}</div>
                            <p className="text-xs text-gray-500">
                                {stats.activeModerators} activos
                            </p>
                            <Button size="sm" className="mt-2" asChild>
                                <Link href="/admin/moderators">Gestionar</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Crear Usuario
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+</div>
                            <p className="text-xs text-gray-500">
                                Nuevo usuario
                            </p>
                            <Button size="sm" className="mt-2" asChild>
                                <Link href="/admin/moderators/create">Crear</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                <Activity className="h-4 w-4 mr-2" />
                                Actividad
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.recentActivity.length}</div>
                            <p className="text-xs text-gray-500">
                                Eventos recientes
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Management Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <TrendingUp className="h-5 w-5 mr-2" />
                                Estadísticas de Usuarios
                            </CardTitle>
                            <CardDescription>
                                Resumen de usuarios administrativos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {auth.user.role === 'super_admin' && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">Administradores</p>
                                            <p className="text-sm text-gray-500">
                                                {stats.activeAdmins} de {stats.totalAdmins} activos
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {stats.totalAdmins > 0 ? Math.round((stats.activeAdmins / stats.totalAdmins) * 100) : 0}%
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">Moderadores</p>
                                        <p className="text-sm text-gray-500">
                                            {stats.activeModerators} de {stats.totalModerators} activos
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-green-600">
                                            {stats.totalModerators > 0 ? Math.round((stats.activeModerators / stats.totalModerators) * 100) : 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Activity className="h-5 w-5 mr-2" />
                                Actividad Reciente
                            </CardTitle>
                            <CardDescription>
                                Últimas acciones en el sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats.recentActivity.length > 0 ? (
                                    stats.recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900">{activity.action}</p>
                                                <p className="text-xs text-gray-500">
                                                    {activity.user} • {formatTimeAgo(activity.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-500 text-sm">No hay actividad reciente</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Links */}
                <Card>
                    <CardHeader>
                        <CardTitle>Accesos Rápidos</CardTitle>
                        <CardDescription>
                            Enlaces directos a las funciones más utilizadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                                <Link href="/admin/moderators">
                                    <Users className="h-5 w-5 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">Gestionar Moderadores</div>
                                        <div className="text-sm text-gray-500">Ver y administrar moderadores</div>
                                    </div>
                                </Link>
                            </Button>

                            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                                <Link href="/admin/moderators/create">
                                    <UserPlus className="h-5 w-5 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">Crear Moderador</div>
                                        <div className="text-sm text-gray-500">Registrar nuevo moderador</div>
                                    </div>
                                </Link>
                            </Button>

                            {auth.user.role === 'super_admin' && (
                                <>
                                    <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                                        <Link href="/admin/admins">
                                            <Shield className="h-5 w-5 mr-3" />
                                            <div className="text-left">
                                                <div className="font-medium">Gestionar Administradores</div>
                                                <div className="text-sm text-gray-500">Ver y administrar administradores</div>
                                            </div>
                                        </Link>
                                    </Button>

                                    <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                                        <Link href="/admin/admins/create">
                                            <UserPlus className="h-5 w-5 mr-3" />
                                            <div className="text-left">
                                                <div className="font-medium">Crear Administrador</div>
                                                <div className="text-sm text-gray-500">Registrar nuevo administrador</div>
                                            </div>
                                        </Link>
                                    </Button>
                                </>
                            )}

                            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                                <Link href="/settings">
                                    <Settings className="h-5 w-5 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">Configuración</div>
                                        <div className="text-sm text-gray-500">Ajustes del sistema</div>
                                    </div>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
