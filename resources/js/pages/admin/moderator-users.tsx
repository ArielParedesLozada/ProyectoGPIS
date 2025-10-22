import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, UserCheck, UserX, Eye, Users, Edit, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData, Paginated } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface ModeratorUser {
    id: number;
    name: string;
    surname: string;
    email: string;
    is_active: boolean;
    created_at: string;
}

interface ModeratorUsersPageProps {
    moderators: Paginated<ModeratorUser>;
}

export default function ModeratorUsers({ moderators }: ModeratorUsersPageProps) {
    const { auth } = usePage<SharedData>().props;
    const [processing, setProcessing] = useState<number | null>(null);

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Moderadores', href: '#' },
    ];

    const handleToggleStatus = (moderatorId: number) => {
        setProcessing(moderatorId);
        router.patch(`/admin/moderators/${moderatorId}/toggle-status`, {}, {
            onFinish: () => setProcessing(null),
        });
    };

    const handleDelete = (moderatorId: number) => {
        if (confirm('¿Estás seguro de que quieres eliminar este moderador? Esta acción no se puede deshacer.')) {
            setProcessing(moderatorId);
            router.delete(`/admin/moderators/${moderatorId}`, {
                onFinish: () => setProcessing(null),
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Moderadores" />

            <div className="space-y-8 px-6 py-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Moderadores</h1>
                            <p className="text-blue-100 text-lg">Gestiona los moderadores del sistema</p>
                        </div>
                        <Button variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30" asChild>
                            <Link href="/admin/moderators/create">
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Moderador
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                <Users className="h-5 w-5 mr-2 text-blue-600" />
                                Total Moderadores
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{moderators.total}</div>
                            <p className="text-sm text-gray-600 mt-1">Registrados en el sistema</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                                Activos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {moderators.data.filter(moderator => moderator.is_active).length}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Pueden acceder al sistema</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                <UserX className="h-5 w-5 mr-2 text-red-600" />
                                Inactivos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">
                                {moderators.data.filter(moderator => !moderator.is_active).length}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Acceso suspendido</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Moderators Table */}
                <div className="bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Users className="h-5 w-5 mr-2 text-blue-600" />
                            Lista de Moderadores
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Administra los permisos y estado de los moderadores del sistema
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="font-semibold text-gray-700">Nombre Completo</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Email</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Estado</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Fecha de Creación</TableHead>
                                    <TableHead className="font-semibold text-gray-700 w-[50px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {moderators.data.map((moderator) => (
                                    <TableRow key={moderator.id} className="hover:bg-gray-50 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-semibold text-sm">
                                                        {moderator.name.charAt(0)}{moderator.surname.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {moderator.name} {moderator.surname}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{moderator.email}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={moderator.is_active ? "default" : "secondary"}
                                                className={moderator.is_active 
                                                    ? "bg-green-100 text-green-800 border-green-200" 
                                                    : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {moderator.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{formatDate(moderator.created_at)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/moderators/${moderator.id}`} className="flex items-center">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver Detalles
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/moderators/${moderator.id}/edit`} className="flex items-center">
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(moderator.id)}
                                                        disabled={processing === moderator.id}
                                                        className={moderator.is_active 
                                                            ? "text-red-600 hover:text-red-700" 
                                                            : "text-green-600 hover:text-green-700"
                                                        }
                                                    >
                                                        {moderator.is_active ? (
                                                            <>
                                                                <UserX className="h-4 w-4 mr-2" />
                                                                Desactivar
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="h-4 w-4 mr-2" />
                                                                Activar
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(moderator.id)}
                                                        disabled={processing === moderator.id}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {moderators.data.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No hay moderadores registrados</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {moderators.links && moderators.links.length > 3 && (
                    <div className="flex justify-center">
                        <nav className="flex space-x-2">
                            {moderators.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url || processing !== null}
                                >
                                    {link.label}
                                </Button>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
