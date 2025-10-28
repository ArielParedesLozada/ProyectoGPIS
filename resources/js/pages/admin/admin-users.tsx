import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, UserCheck, UserX, Eye, Edit, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData, Paginated } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import GeneralModal from '@/components/ui/general-modal';

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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [actionType, setActionType] = useState<'toggle' | 'delete' | null>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

    // Refrescar automáticamente cuando se navega a esta página
    useEffect(() => {
        router.reload({ only: ['admins'] });
    }, []);

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Administradores', href: '#' },
    ];

    const handleToggleStatus = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        setActionType('toggle');
        setShowConfirmModal(true);
    };

    const handleDelete = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        setActionType('delete');
        setShowConfirmModal(true);
    };

    const confirmAction = () => {
        if (!selectedAdmin || !actionType) return;

        setProcessing(selectedAdmin.id);
        
        if (actionType === 'toggle') {
            router.patch(`/admin/admins/${selectedAdmin.id}/toggle-status`, {}, {
                onFinish: () => {
                    setProcessing(null);
                    setShowConfirmModal(false);
                    setSelectedAdmin(null);
                    setActionType(null);
                },
            });
        } else if (actionType === 'delete') {
            router.delete(`/admin/admins/${selectedAdmin.id}`, {
                onFinish: () => {
                    setProcessing(null);
                    setShowConfirmModal(false);
                    setSelectedAdmin(null);
                    setActionType(null);
                },
            });
        }
    };

    const cancelAction = () => {
        setShowConfirmModal(false);
        setSelectedAdmin(null);
        setActionType(null);
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

            <div className="space-y-8 px-6 py-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Administradores</h1>
                            <p className="text-blue-100 text-lg">Gestiona los administradores del sistema</p>
                        </div>
                        {auth.user.role === 'super_admin' && (
                            <Button variant="secondary" className="bg-white/20 text-white border-white/50 hover:bg-white/30 hover:border-white/70 shadow-lg" asChild>
                                <Link href="/admin/admins/create">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Administrador
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center">
                                <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                                Total Administradores
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{admins.total}</div>
                            <p className="text-sm text-muted-foreground mt-1">Registrados en el sistema</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center">
                                <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                                Activos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {admins.data.filter(admin => admin.is_active).length}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Pueden acceder al sistema</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center">
                                <UserX className="h-5 w-5 mr-2 text-red-600" />
                                Inactivos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">
                                {admins.data.filter(admin => !admin.is_active).length}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Acceso suspendido</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Admins Table */}
                <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg">
                    <div className="px-6 py-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center">
                            <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                            Lista de Administradores
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Administra los permisos y estado de los administradores del sistema
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="border border-border/20">
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b border-border/30">
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Nombre Completo</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Email</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Estado</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Fecha de Creación</TableHead>
                                    <TableHead className="font-semibold text-foreground w-[50px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.data.map((admin) => (
                                    <TableRow key={admin.id} className="hover:bg-muted/50 transition-colors border-b border-border/10">
                                        <TableCell className="font-medium border-r border-border/20 last:border-r-0">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-semibold text-sm">
                                                        {admin.name.charAt(0)}{admin.surname.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {admin.name} {admin.surname}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground border-r border-border/20 last:border-r-0">{admin.email}</TableCell>
                                        <TableCell className="border-r border-border/20 last:border-r-0">
                                            <Badge 
                                                variant={admin.is_active ? "default" : "secondary"}
                                                className={admin.is_active 
                                                    ? "bg-green-100 text-green-800 border-green-200" 
                                                    : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {admin.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground border-r border-border/20 last:border-r-0">{formatDate(admin.created_at)}</TableCell>
                                        <TableCell className="border-r border-border/20 last:border-r-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/admins/${admin.id}`} className="flex items-center">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver Detalles
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/admins/${admin.id}/edit`} className="flex items-center">
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(admin)}
                                                        disabled={processing === admin.id}
                                                        className={admin.is_active 
                                                            ? "text-red-600 hover:text-red-700" 
                                                            : "text-green-600 hover:text-green-700"
                                                        }
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
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(admin)}
                                                        disabled={processing === admin.id}
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

                    {admins.data.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No hay administradores registrados</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {admins.links && admins.links.length > 0 && (
                    <div className="flex justify-center">
                        <nav className="flex space-x-2">
                            {admins.links.map((link, index) => (
                                link.url ? (
                                    <Button
                                        key={index}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => link.url && router.get(link.url)}
                                        disabled={processing !== null}
                                        className={link.label.includes('Previous') || link.label.includes('Next') ? "border-0" : ""}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={index}
                                        className="px-3 py-2 text-muted-foreground cursor-not-allowed text-sm border-0 rounded-md"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                )
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Modal de Confirmación */}
            <GeneralModal
                isOpen={showConfirmModal}
                onClose={cancelAction}
                title={actionType === 'toggle' ? 'Confirmar Cambio de Estado' : 'Confirmar Eliminación'}
            >
                <div className="space-y-4">
                    {actionType === 'toggle' && selectedAdmin && (
                        <>
                            <p className="text-gray-600">
                                ¿Estás seguro de que quieres {selectedAdmin.is_active ? 'desactivar' : 'activar'} la cuenta de{' '}
                                <span className="font-semibold">{selectedAdmin.name} {selectedAdmin.surname}</span>?
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    {selectedAdmin.is_active 
                                        ? 'El administrador perderá acceso al sistema hasta que sea reactivado.'
                                        : 'El administrador podrá acceder nuevamente al sistema.'
                                    }
                                </p>
                            </div>
                        </>
                    )}
                    
                    {actionType === 'delete' && selectedAdmin && (
                        <>
                            <p className="text-gray-600">
                                ¿Estás seguro de que quieres eliminar permanentemente la cuenta de{' '}
                                <span className="font-semibold">{selectedAdmin.name} {selectedAdmin.surname}</span>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-800">
                                    <strong>Esta acción no se puede deshacer.</strong> Se eliminará toda la información del administrador.
                                </p>
                            </div>
                        </>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={cancelAction}
                            disabled={processing !== null}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant={actionType === 'delete' ? 'destructive' : 'default'}
                            onClick={confirmAction}
                            disabled={processing !== null}
                        >
                            {processing !== null ? 'Procesando...' : 'Confirmar'}
                        </Button>
                    </div>
                </div>
            </GeneralModal>
        </AppLayout>
    );
}
