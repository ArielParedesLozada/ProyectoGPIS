import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, UserCheck, UserX, Eye } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData, Paginated } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface AdminUser {
    id: number;
    name: string;
    surname: string;
    email: string;
    is_active: boolean;
    created_at: string;
}

interface AdminUsersPageProps {
    admins: Paginated<AdminUser>;
}

export default function AdminUsers({ admins }: AdminUsersPageProps) {
    const { auth } = usePage<SharedData>().props;
    const [processing, setProcessing] = useState<number | null>(null);

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Administradores', href: '#' },
    ];

    const handleToggleStatus = (adminId: number) => {
        setProcessing(adminId);
        router.patch(`/admin/admins/${adminId}/toggle-status`, {}, {
            onFinish: () => setProcessing(null),
        });
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
            <Head title="Administradores" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Administradores</h1>
                        <p className="text-gray-600">Gestiona los administradores del sistema</p>
                    </div>
                    {auth.user.role === 'super_admin' && (
                        <Button asChild>
                            <Link href="/admin/admins/create">
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Administrador
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{admins.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {admins.data.filter(admin => admin.is_active).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Inactivos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {admins.data.filter(admin => !admin.is_active).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Admins Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Administradores</CardTitle>
                        <CardDescription>
                            Administra los permisos y estado de los administradores
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha de Creación</TableHead>
                                    <TableHead className="w-[50px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.data.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">
                                            {admin.name} {admin.surname}
                                        </TableCell>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={admin.is_active ? "default" : "secondary"}>
                                                {admin.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(admin.created_at)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/admins/${admin.id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver Detalles
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(admin.id)}
                                                        disabled={processing === admin.id}
                                                    >
                                                        {admin.is_active ? (
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
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {admins.data.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No hay administradores registrados</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {admins.links && admins.links.length > 3 && (
                    <div className="flex justify-center">
                        <nav className="flex space-x-2">
                            {admins.links.map((link, index) => (
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
