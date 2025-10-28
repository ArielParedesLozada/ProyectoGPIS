import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, IdCard, UserCheck, Heart } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface BuyerUser {
    id: number;
    cedula: string;
    name: string;
    surname: string;
    phone: string;
    address: string;
    gender: string;
    email: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    favorites_count: number;
}

interface BuyerDetailsProps {
    buyer: BuyerUser;
}

export default function BuyerDetails({ buyer }: BuyerDetailsProps) {
    const { auth } = usePage<SharedData>().props;

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Compradores', href: '/admin/buyers' },
        { title: buyer.name + ' ' + buyer.surname, href: '#' },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalles - ${buyer.name} ${buyer.surname}`} />

            <div className="space-y-6 px-6 py-6">
                {/* Back Link */}
                <div className="max-w-4xl mx-auto">
                    <Link href="/admin/buyers" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a Compradores
                    </Link>
                </div>

                {/* Header */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card rounded-lg shadow-lg border border-border">
                        <div className="px-6 py-6 border-b border-border">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                                        <span className="text-orange-600 font-bold text-xl">
                                            {buyer.name.charAt(0)}{buyer.surname.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-foreground">
                                            {buyer.name} {buyer.surname}
                                        </h1>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <Badge 
                                                variant={buyer.is_active ? "default" : "secondary"}
                                                className={buyer.is_active 
                                                    ? "bg-green-100 text-green-800 border-green-200" 
                                                    : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {buyer.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                                                Comprador
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Información Personal */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-lg">
                                            <IdCard className="h-5 w-5 mr-2 text-orange-600" />
                                            Información Personal
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <IdCard className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Cédula</p>
                                                <p className="font-medium">{buyer.cedula}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p className="font-medium">{buyer.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Teléfono</p>
                                                <p className="font-medium">{buyer.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Dirección</p>
                                                <p className="font-medium">{buyer.address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Género</p>
                                                <p className="font-medium capitalize">{buyer.gender}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Información del Sistema */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-lg">
                                            <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                                            Información del Sistema
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                                                <p className="font-medium">{formatDate(buyer.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Última Actualización</p>
                                                <p className="font-medium">{formatDate(buyer.updated_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Estado de la Cuenta</p>
                                                <Badge 
                                                    variant={buyer.is_active ? "default" : "secondary"}
                                                    className={buyer.is_active 
                                                        ? "bg-green-100 text-green-800 border-green-200" 
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                    }
                                                >
                                                    {buyer.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Heart className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Favoritos</p>
                                                <p className="font-medium">{buyer.favorites_count}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

