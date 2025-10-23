import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, UserCheck, UserX, Mail, Phone, MapPin, Calendar, IdCard } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface ModeratorUser {
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
}

interface ModeratorDetailsProps {
    moderator: ModeratorUser;
}

export default function ModeratorDetails({ moderator }: ModeratorDetailsProps) {
    const { auth } = usePage<SharedData>().props;
    const [processing, setProcessing] = useState<number | null>(null);

    const breadcrumbs = [
        { title: 'Administración', href: '#' },
        { title: 'Moderadores', href: '/admin/moderators' },
        { title: moderator.name + ' ' + moderator.surname, href: '#' },
    ];

    const handleToggleStatus = () => {
        setProcessing(moderator.id);
        router.patch(`/admin/moderators/${moderator.id}/toggle-status`, {}, {
            onFinish: () => setProcessing(null),
        });
    };

    const handleDelete = () => {
        if (confirm('¿Estás seguro de que quieres eliminar este moderador? Esta acción no se puede deshacer.')) {
            router.delete(`/admin/moderators/${moderator.id}`);
        }
    };

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
            <Head title={`Detalles - ${moderator.name} ${moderator.surname}`} />

            <div className="space-y-6 px-6 py-6">
                {/* Back Link */}
                <div className="max-w-4xl mx-auto">
                    <Link href="/admin/moderators" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a Moderadores
                    </Link>
                </div>

                {/* Header */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card rounded-lg shadow-lg border border-border">
                        <div className="px-6 py-6 border-b border-border">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-bold text-xl">
                                            {moderator.name.charAt(0)}{moderator.surname.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-foreground">
                                            {moderator.name} {moderator.surname}
                                        </h1>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <Badge 
                                                variant={moderator.is_active ? "default" : "secondary"}
                                                className={moderator.is_active 
                                                    ? "bg-green-100 text-green-800 border-green-200" 
                                                    : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {moderator.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                                Moderador
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/moderators/${moderator.id}/edit`}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                        </Link>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleToggleStatus}
                                        disabled={processing === moderator.id}
                                        className={moderator.is_active 
                                            ? "text-red-600 hover:text-red-700 border-red-200" 
                                            : "text-green-600 hover:text-green-700 border-green-200"
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
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleDelete}
                                        className="text-red-600 hover:text-red-700 border-red-200"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Información Personal */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-lg">
                                            <IdCard className="h-5 w-5 mr-2 text-blue-600" />
                                            Información Personal
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <IdCard className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Cédula</p>
                                                <p className="font-medium">{moderator.cedula}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p className="font-medium">{moderator.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Teléfono</p>
                                                <p className="font-medium">{moderator.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Dirección</p>
                                                <p className="font-medium">{moderator.address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Género</p>
                                                <p className="font-medium capitalize">{moderator.gender}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Información del Sistema */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-lg">
                                            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                                            Información del Sistema
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                                                <p className="font-medium">{formatDate(moderator.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Última Actualización</p>
                                                <p className="font-medium">{formatDate(moderator.updated_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Estado de la Cuenta</p>
                                                <Badge 
                                                    variant={moderator.is_active ? "default" : "secondary"}
                                                    className={moderator.is_active 
                                                        ? "bg-green-100 text-green-800 border-green-200" 
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                    }
                                                >
                                                    {moderator.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
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
