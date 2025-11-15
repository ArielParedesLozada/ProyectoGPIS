import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShoppingCart, UserCheck, UserX, Eye } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData, Paginated } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import GeneralModal from '@/components/ui/general-modal';

interface BuyerUser {
    id: number;
    name: string;
    surname: string;
    email: string;
    phone: string;
    is_active: boolean;
    created_at: string;
}

interface BuyerUsersPageProps {
    buyers: Paginated<BuyerUser>;
}

export default function BuyerUsers({ buyers }: BuyerUsersPageProps) {
    const { auth } = usePage<SharedData>().props;
    const [processing, setProcessing] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedBuyer, setSelectedBuyer] = useState<BuyerUser | null>(null);

    // Refrescar automáticamente cuando se navega a esta página
    useEffect(() => {
        router.reload({ only: ['buyers'] });
    }, []);

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Compradores', href: '#' },
    ];

    const handleToggleStatus = (buyer: BuyerUser) => {
        setSelectedBuyer(buyer);
        setShowConfirmModal(true);
    };

    const confirmAction = () => {
        if (!selectedBuyer) return;

        setProcessing(selectedBuyer.id);
        router.patch(`/admin/buyers/${selectedBuyer.id}/toggle-status`, {}, {
            onFinish: () => {
                setProcessing(null);
                setShowConfirmModal(false);
                setSelectedBuyer(null);
            },
        });
    };

    const cancelAction = () => {
        setShowConfirmModal(false);
        setSelectedBuyer(null);
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
            <Head title="Compradores" />

            <div className="space-y-8 px-6 py-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Compradores</h1>
                            <p className="text-blue-100 text-lg">Gestiona los compradores del sistema</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-card/95 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center">
                                <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                                Total Compradores
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{buyers.total}</div>
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
                                {buyers.data.filter(buyer => buyer.is_active).length}
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
                                {buyers.data.filter(buyer => !buyer.is_active).length}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Cuentas suspendidas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Buyers Table */}
                <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg">
                    <div className="px-6 py-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center">
                            <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                            Lista de Compradores
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Administra el estado de los compradores del sistema
                        </p>
                    </div>
                    {/* Vista móvil - Cards */}
                    <div className="block md:hidden px-4 pb-4 space-y-4">
                        {buyers.data.map((buyer) => (
                            <Card key={buyer.id} className="border border-border/20">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-blue-600 font-semibold text-sm">
                                                    {buyer.name.charAt(0)}{buyer.surname.charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {buyer.name} {buyer.surname}
                                                </div>
                                                <Badge 
                                                    variant={buyer.is_active ? "default" : "secondary"}
                                                    className={`mt-1 ${buyer.is_active 
                                                        ? "bg-green-100 text-green-800 border-green-200" 
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                    }`}
                                                >
                                                    {buyer.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/buyers/${buyer.id}`} className="flex items-center">
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Ver Detalles
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleToggleStatus(buyer)}
                                                    disabled={processing === buyer.id}
                                                    className={buyer.is_active 
                                                        ? "text-red-600 hover:text-red-700" 
                                                        : "text-green-600 hover:text-green-700"
                                                    }
                                                >
                                                    {buyer.is_active ? (
                                                        <>
                                                            <UserX className="h-4 w-4 mr-2" />
                                                            Suspender Cuenta
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck className="h-4 w-4 mr-2" />
                                                            Reactivar Cuenta
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="font-medium text-muted-foreground">Email: </span>
                                            <span className="text-foreground">{buyer.email}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-muted-foreground">Teléfono: </span>
                                            <span className="text-foreground">{buyer.phone}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-muted-foreground">Fecha de Registro: </span>
                                            <span className="text-foreground">{formatDate(buyer.created_at)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Vista desktop - Tabla */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table className="border border-border/20">
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b border-border/30">
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Nombre Completo</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Email</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Teléfono</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Estado</TableHead>
                                    <TableHead className="font-semibold text-foreground border-r border-border/20 last:border-r-0">Fecha de Registro</TableHead>
                                    <TableHead className="font-semibold text-foreground w-[50px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {buyers.data.map((buyer) => (
                                    <TableRow key={buyer.id} className="hover:bg-muted/50 transition-colors border-b border-border/10">
                                        <TableCell className="font-medium border-r border-border/20 last:border-r-0">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-semibold text-sm">
                                                        {buyer.name.charAt(0)}{buyer.surname.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {buyer.name} {buyer.surname}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground border-r border-border/20 last:border-r-0">{buyer.email}</TableCell>
                                        <TableCell className="text-muted-foreground border-r border-border/20 last:border-r-0">{buyer.phone}</TableCell>
                                        <TableCell className="border-r border-border/20 last:border-r-0">
                                            <Badge 
                                                variant={buyer.is_active ? "default" : "secondary"}
                                                className={buyer.is_active 
                                                    ? "bg-green-100 text-green-800 border-green-200" 
                                                    : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {buyer.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground border-r border-border/20 last:border-r-0">{formatDate(buyer.created_at)}</TableCell>
                                        <TableCell className="border-r border-border/20 last:border-r-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/buyers/${buyer.id}`} className="flex items-center">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver Detalles
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(buyer)}
                                                        disabled={processing === buyer.id}
                                                        className={buyer.is_active 
                                                            ? "text-red-600 hover:text-red-700" 
                                                            : "text-green-600 hover:text-green-700"
                                                        }
                                                    >
                                                        {buyer.is_active ? (
                                                            <>
                                                                <UserX className="h-4 w-4 mr-2" />
                                                                Suspender Cuenta
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="h-4 w-4 mr-2" />
                                                                Reactivar Cuenta
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
                    </div>

                    {buyers.data.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No hay compradores registrados</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {buyers.links && buyers.links.length > 0 && (
                    <div className="flex justify-center">
                        <nav className="flex space-x-2">
                            {buyers.links.map((link, index) => (
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
                title="Confirmar Cambio de Estado"
            >
                <div className="space-y-4">
                    {selectedBuyer && (
                        <>
                            <p className="text-gray-600">
                                ¿Estás seguro de que quieres {selectedBuyer.is_active ? 'suspender' : 'reactivar'} la cuenta de{' '}
                                <span className="font-semibold">{selectedBuyer.name} {selectedBuyer.surname}</span>?
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    {selectedBuyer.is_active 
                                        ? 'El comprador perderá acceso al sistema hasta que sea reactivado.'
                                        : 'El comprador podrá acceder nuevamente al sistema.'
                                    }
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
                            variant="default"
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

