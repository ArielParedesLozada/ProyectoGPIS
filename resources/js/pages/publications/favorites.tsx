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
import { useState, useRef, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    Heart, 
    MoreHorizontal, 
    Eye, 
    Calendar,
    MapPin,
    DollarSign,
    Trash2
} from "lucide-react";

// Componente para tooltip condicional
const ConditionalTooltip = ({ children, content, className = "" }: { 
    children: React.ReactNode; 
    content: string; 
    className?: string; 
}) => {
    const [isTruncated, setIsTruncated] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkTruncation = () => {
            if (elementRef.current) {
                const element = elementRef.current;
                
                // Para line-clamp, comparar scrollHeight con offsetHeight (con tolerancia de 2px)
                const isVerticallyTruncated = element.scrollHeight > element.offsetHeight + 2;
                
                // Para truncate (texto horizontal), comparar scrollWidth con clientWidth (con tolerancia de 2px)
                const isHorizontallyTruncated = element.scrollWidth > element.clientWidth + 2;
                
                // Verificar si hay contenido oculto
                const isOverflowing = isVerticallyTruncated || isHorizontallyTruncated;
                
                setIsTruncated(isOverflowing);
            }
        };

        // Usar setTimeout para asegurar que el DOM esté renderizado
        const timeoutId = setTimeout(checkTruncation, 100);
        
        // También verificar en el próximo frame
        const rafId = requestAnimationFrame(checkTruncation);
        
        // Verificar después de que las fuentes se carguen
        const fontTimeoutId = setTimeout(checkTruncation, 500);
        
        window.addEventListener('resize', checkTruncation);
        
        return () => {
            clearTimeout(timeoutId);
            clearTimeout(fontTimeoutId);
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', checkTruncation);
        };
    }, [content]);

    if (isTruncated) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div ref={elementRef} className={`${className} cursor-help`}>
                        {children}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="whitespace-normal break-words">{content}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div ref={elementRef} className={className}>
            {children}
        </div>
    );
};

function FavoritesContent() {
    const [removeModalOpen, setRemoveModalOpen] = useState(false);
    const [publicationToRemove, setPublicationToRemove] = useState<Publication | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Favoritos',
            href: '/favorites',
        },
    ];

    const { auth, favorites, categories } = usePage<SharedData & {
        favorites: Paginated<Publication>,
        categories: Category[],
    }>().props;

    const handleRemove = (id: number) => {
        const publication = favorites.data.find(p => p.id === id);
        setPublicationToRemove(publication || null);
        setRemoveModalOpen(true);
    };

    const handleConfirmRemove = () => {
        if (!publicationToRemove) return;
        
        setIsRemoving(true);
        router.delete(`/favorites/${publicationToRemove.id}`, {
            onSuccess: () => {
                setRemoveModalOpen(false);
                setPublicationToRemove(null);
                setIsRemoving(false);
            },
            onError: () => {
                setIsRemoving(false);
            }
        });
    };

    const handleCloseRemoveModal = () => {
        setRemoveModalOpen(false);
        setPublicationToRemove(null);
        setIsRemoving(false);
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
            <Head title="Favoritos" />
            
            <div className="bg-gray-50 min-h-screen space-y-8 px-6 py-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Mis Favoritos</h1>
                            <p className="text-red-100 text-lg">Publicaciones que te han gustado</p>
                        </div>
                        <div className="flex space-x-3">
                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                <Heart className="w-4 h-4 mr-1" />
                                {favorites.data.length} favoritos
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Heart className="h-5 w-5 mr-2 text-red-600" />
                                    Total Favoritos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600 mb-2">{favorites.data.length}</div>
                                <p className="text-sm text-gray-600">Publicaciones guardadas</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                                    Productos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600 mb-2">
                                    {favorites.data.filter(p => p.type === 'producto').length}
                                </div>
                                <p className="text-sm text-gray-600">Productos favoritos</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Heart className="h-5 w-5 mr-2 text-purple-600" />
                                    Servicios
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-purple-600 mb-2">
                                    {favorites.data.filter(p => p.type === 'servicio').length}
                                </div>
                                <p className="text-sm text-gray-600">Servicios favoritos</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Favorites Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {favorites.data.map((publication) => (
                            <Card key={publication.id} className="group hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <ConditionalTooltip 
                                                content={publication.title}
                                                className="text-lg line-clamp-2 mb-2"
                                            >
                                                <CardTitle>
                                                    {publication.title}
                                                </CardTitle>
                                            </ConditionalTooltip>
                                            <div className="flex gap-2 mb-2">
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
                                                    <Link href={`/publications/${publication.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleRemove(publication.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Quitar de Favoritos
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
                                                className="w-full h-48 object-cover rounded-lg"
                                            />
                                            <div className="absolute top-2 left-2">
                                                <Badge variant="secondary" className="bg-white/90">
                                                    {publication.category.name}
                                                </Badge>
                                            </div>
                                            <div className="absolute bottom-2 left-2">
                                                <div className="bg-red-500 text-white p-2 rounded-full">
                                                    <Heart className="w-4 h-4 fill-current" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <ConditionalTooltip 
                                            content={publication.description || ''}
                                            className="text-sm text-gray-600 line-clamp-2"
                                        >
                                            <p>
                                                {publication.description}
                                            </p>
                                        </ConditionalTooltip>

                                        {/* Location */}
                                        <div className="flex items-center text-sm text-gray-500 mb-2">
                                            <svg className="w-4 h-4 text-red-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            <ConditionalTooltip 
                                                content={publication.location || ''}
                                                className="truncate flex-1 min-w-0"
                                            >
                                                <span>
                                                    {publication.location}
                                                </span>
                                            </ConditionalTooltip>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-3">
                                            <div className="text-xl font-bold text-gray-900">
                                                ${publication.price}
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="flex items-center text-xs text-gray-500">
                                            <svg className="w-3 h-3 text-blue-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                            <span>
                                                {new Date(publication.published_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Paginación - Solo visible cuando hay favoritos */}
                    {favorites.data && favorites.data.length > 0 && favorites.links && favorites.links.length > 0 && (
                        <div className="flex justify-center mt-8">
                            <div className="flex items-center gap-2">
                                {favorites.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                                link.active 
                                                    ? "bg-red-600 text-white border-red-600" 
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
                    {favorites.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Heart className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No tienes favoritos
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Comienza agregando publicaciones a tus favoritos
                            </p>
                            <Link href="/publications">
                                <Button className="bg-red-600 hover:bg-red-700 text-white">
                                    <Heart className="w-4 h-4 mr-2" />
                                    Explorar Publicaciones
                                </Button>
                            </Link>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            {removeModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Quitar de Favoritos
                        </h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que quieres quitar "{publicationToRemove?.title}" de tus favoritos?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={handleCloseRemoveModal}
                                disabled={isRemoving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmRemove}
                                disabled={isRemoving}
                            >
                                {isRemoving ? 'Quitando...' : 'Quitar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Layout estático de Inertia
Favorites.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[
        {
            title: 'Favoritos',
            href: '/favorites',
        },
    ]}>
        {page}
    </AppLayout>
);

export default function Favorites() {
    return <FavoritesContent />;
}
