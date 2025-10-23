import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import AppLayout from "@/layouts/app-layout";
import { SharedData, Paginated, Publication, Category, BreadcrumbItem } from "@/types";
import { usePage, router, Head, Link } from "@inertiajs/react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    Plus, 
    MoreHorizontal, 
    Edit, 
    Trash2, 
    Eye, 
    EyeOff,
    Calendar,
    MapPin,
    DollarSign
} from "lucide-react";
import DeleteConfirmationModal from "@/components/publications/delete-confirmation-modal";
function MyPublicationsContent() {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [publicationToDelete, setPublicationToDelete] = useState<Publication | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Mis Publicaciones',
            href: '/my-publications',
        },
    ];

    const { auth, publications, categories } = usePage<SharedData & {
        publications: Paginated<Publication>,
        categories: Category[],
    }>().props;

    const handleDelete = (id: number) => {
        const publication = publications.data.find(p => p.id === id);
        setPublicationToDelete(publication || null);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!publicationToDelete) return;
        
        setIsDeleting(true);
        router.delete(`/my-publications/${publicationToDelete.id}`, {
            onSuccess: () => {
                setDeleteModalOpen(false);
                setPublicationToDelete(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            }
        });
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setPublicationToDelete(null);
        setIsDeleting(false);
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/my-publications/${id}/toggle-status`);
    };

    const getStatusBadge = (status: number) => {
        return status === 1 ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
                Habilitado
            </Badge>
        ) : (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
                Inhabilitado
            </Badge>
        );
    };

    const getTypeBadge = (type: string) => {
        return type === 'producto' ? (
            <Badge variant="outline" className="border-blue-200 text-blue-800">
                Producto
            </Badge>
        ) : (
            <Badge variant="outline" className="border-purple-200 text-purple-800">
                Servicio
            </Badge>
        );
    };

    return (
        <>
            <Head title="Mis Publicaciones" />
            
            <div className="bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Publicaciones</h1>
                                <p className="text-gray-600">Gestiona tus productos y servicios</p>
                                {publications.data.length > 0 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Mostrando {publications.data.length} publicaciones
                                    </p>
                                )}
                            </div>
                            <Link href="/my-publications/create">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Crear Publicación
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Publicaciones</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{publications.data.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Habilitadas</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {publications.data.filter(p => p.status === 1).length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Inhabilitadas</CardTitle>
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {publications.data.filter(p => p.status === 2).length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Publications Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publications.data.map((publication) => (
                            <Card key={publication.id} className="group hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <CardTitle className="text-lg line-clamp-2 mb-2 cursor-help">
                                                            {publication.title}
                                                        </CardTitle>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="whitespace-normal break-words">{publication.title}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <div className="flex gap-2 mb-2">
                                                    {getStatusBadge(publication.status)}
                                                    {getTypeBadge(publication.type)}
                                                </div>
                                            </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/my-publications/${publication.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/my-publications/${publication.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleToggleStatus(publication.id)}
                                                >
                                                    {publication.status === 1 ? (
                                                        <>
                                                            <EyeOff className="mr-2 h-4 w-4" />
                                                            Inhabilitar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Habilitar
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleDelete(publication.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        {/* Image */}
                                        <div className="relative">
                                            <img
                                                src={publication.images?.[0]?.image_url ? `/storage/${publication.images[0].image_url}` : "https://picsum.photos/300/200"}
                                                alt={publication.title}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                            <div className="absolute top-2 left-2">
                                                <Badge variant="secondary" className="bg-white/90">
                                                    {publication.category.name}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="text-sm text-gray-600 line-clamp-2 cursor-help">
                                                    {publication.description}
                                                </p>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="whitespace-normal break-words">{publication.description}</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        {/* Location */}
                                        <div className="flex items-center text-sm text-gray-500 mb-2">
                                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="truncate cursor-help flex-1 min-w-0">
                                                        {publication.location}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="whitespace-normal break-words">{publication.location}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-3">
                                            <div className="text-xl font-bold text-gray-900">
                                                ${publication.price}
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            <span>
                                                {new Date(publication.published_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Paginación - Siempre visible */}
                    {publications.links.length > 3 && (
                        <div className="flex justify-center mt-8">
                            <div className="flex items-center gap-2">
                                {publications.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                                link.active 
                                                    ? "bg-blue-600 text-white border-blue-600" 
                                                    : "text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="px-4 py-2 text-gray-400 cursor-not-allowed text-sm"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {publications.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Plus className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No tienes publicaciones
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Comienza creando tu primera publicación
                            </p>
                            <Link href="/my-publications/create">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Crear Primera Publicación
                                </Button>
                            </Link>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                publicationTitle={publicationToDelete?.title}
            />
        </>
    );
}

// Layout estático de Inertia
MyPublications.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[
        {
            title: 'Mis Publicaciones',
            href: '/my-publications',
        },
    ]}>
        {page}
    </AppLayout>
);

export default function MyPublications() {
    return <MyPublicationsContent />;
}

