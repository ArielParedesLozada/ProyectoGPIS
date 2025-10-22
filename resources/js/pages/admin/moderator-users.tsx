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

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Moderadores</h1>
                        <p className="text-gray-600">Gestiona los moderadores del sistema</p>
                    </div>
                    <Button asChild>
                        <Link href="/admin/moderators/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Moderador
                        </Link>
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{moderators.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {moderators.data.filter(moderator => moderator.is_active).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Inactivos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {moderators.data.filter(moderator => !moderator.is_active).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Moderators Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Moderadores</CardTitle>
                        <CardDescription>
                            Administra los permisos y estado de los moderadores
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
                                {moderators.data.map((moderator) => (
                                    <TableRow key={moderator.id}>
                                        <TableCell className="font-medium">
                                            {moderator.name} {moderator.surname}
                                        </TableCell>
                                        <TableCell>{moderator.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={moderator.is_active ? "default" : "secondary"}>
                                                {moderator.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(moderator.created_at)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/moderators/${moderator.id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver Detalles
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(moderator.id)}
                                                        disabled={processing === moderator.id}
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
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {moderators.data.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No hay moderadores registrados</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

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
