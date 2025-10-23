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

            <div className="space-y-8 px-6 py-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Dashboard de Administración</h1>
                            <p className="text-blue-100 text-lg">
                                Bienvenido, {auth.user.name}. Gestiona el sistema desde aquí.
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                {auth.user.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {auth.user.role === 'super_admin' && (
                        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm ">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-card-foreground flex items-center">
                                        <Shield className="h-5 w-5 mr-2 text-blue-600" />
                                        Administradores
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                        {stats.activeAdmins}/{stats.totalAdmins}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalAdmins}</div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {stats.activeAdmins} activos
                                </p>
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Último acceso</span>
                                        <span className="font-medium text-foreground">Hoy</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Permisos</span>
                                        <span className="font-medium text-foreground">Completos</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Estado</span>
                                        <span className="font-medium text-green-600">Activo</span>
                                    </div>
                                </div>
                                <Button size="sm" className="w-full" asChild>
                                    <Link href="/admin/admins">Gestionar</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm ">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-card-foreground flex items-center">
                                    <Users className="h-5 w-5 mr-2 text-green-600" />
                                    Moderadores
                                </CardTitle>
                                <Badge variant="outline" className="text-xs">
                                    {stats.activeModerators}/{stats.totalModerators}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalModerators}</div>
                            <p className="text-sm text-muted-foreground mb-4">
                                {stats.activeModerators} activos
                            </p>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Última actividad</span>
                                    <span className="font-medium text-foreground">Hace 2h</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Tareas pendientes</span>
                                    <span className="font-medium text-foreground">3</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Estado</span>
                                    <span className="font-medium text-green-600">Activo</span>
                                </div>
                            </div>
                            <Button size="sm" className="w-full" asChild>
                                <Link href="/admin/moderators">Gestionar</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Publicaciones Overview Card */}
                    <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm ">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-card-foreground flex items-center">
                                    <Activity className="h-5 w-5 mr-2 text-purple-600" />
                                    Publicaciones
                                </CardTitle>
                                <Badge variant="outline" className="text-xs">
                                    Total
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Publicaciones en el sistema
                            </p>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Pendientes</span>
                                    <span className="font-medium text-foreground">0</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Aprobadas</span>
                                    <span className="font-medium text-foreground">0</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Rechazadas</span>
                                    <span className="font-medium text-foreground">0</span>
                                </div>
                            </div>
                            <Button size="sm" className="w-full" asChild>
                                <Link href="/publication">Gestionar</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* User Management Stats */}
                    <Card className="bg-card/95 backdrop-blur-sm  shadow-lg">
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
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <div>
                                            <p className="font-medium text-foreground">Administradores</p>
                                            <p className="text-sm text-muted-foreground">
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
                                
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-medium text-foreground">Moderadores</p>
                                        <p className="text-sm text-muted-foreground">
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
                    <Card className="bg-card/95 backdrop-blur-sm  shadow-lg">
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
                                        <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-muted rounded">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground">{activity.action}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {activity.user} • {formatTimeAgo(activity.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-muted-foreground text-sm">No hay actividad reciente</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
