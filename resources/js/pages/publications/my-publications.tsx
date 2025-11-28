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
import { SharedData, Paginated, Publication, Category } from "@/types";
import { usePage, router, Head, Link } from "@inertiajs/react";
import { useState, useRef, useEffect } from "react";
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
    DollarSign,
    AlertTriangle,
    MessageSquare
} from "lucide-react";
import DeleteConfirmationModal from "@/components/publications/delete-confirmation-modal";
import GeneralModal from "@/components/ui/general-modal";
import EmptyState from "@/components/ui/empty-state";
import SmartThumbnail from "@/components/ui/smart-thumbnail";
// useToast removido - se usa FlashToastHandler globalmente

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

function MyPublicationsContent() {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [publicationToDelete, setPublicationToDelete] = useState<Publication | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { auth, publications, categories, flash } = usePage<SharedData & {
        publications: Paginated<Publication>,
        categories: Category[],
        flash?: {
            success?: string;
        };
    }>().props;

    // showToast removido - se usa FlashToastHandler globalmente
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
    const [appealReason, setAppealReason] = useState('');
    const [appealReasonError, setAppealReasonError] = useState<string | null>(null);

    // Constantes de validación para appeal_reason
    const APPEAL_REASON_MIN_LENGTH = 1; // El backend no tiene min, pero el frontend puede validar
    const APPEAL_REASON_MAX_LENGTH = 100;

    // Validar appeal_reason
    const validateAppealReason = (value: string): string | null => {
        if (!value.trim()) {
            return 'El campo motivo es requerido';
        }
        if (value.length > APPEAL_REASON_MAX_LENGTH) {
            return `El motivo no puede exceder ${APPEAL_REASON_MAX_LENGTH} caracteres`;
        }
        return null;
    };

    // Manejar cambio en appeal_reason con validación en tiempo real
    const handleAppealReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setAppealReason(value);
        
        // Validar solo si hay contenido o si ya hay un error
        if (value.length > 0 || appealReasonError) {
            const error = validateAppealReason(value);
            setAppealReasonError(error);
        }
    };

    // Los toasts se manejan automáticamente por FlashToastHandler

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
        router.patch(`/my-publications/${id}/toggle-status`, {}, {
            // Los toasts se manejan automáticamente por FlashToastHandler
        });
    };

    const handleAppeal = (publication: Publication) => {
        setSelectedPublication(publication);
        setShowAppealModal(true);
        setAppealReason('');
        setAppealReasonError(null);
    };

    const handleCloseAppealModal = () => {
        setShowAppealModal(false);
        setAppealReason('');
        setAppealReasonError(null);
        setSelectedPublication(null);
    };

    const handleSubmitAppeal = () => {
        if (!selectedPublication) return;

        const error = validateAppealReason(appealReason);
        if (error) {
            setAppealReasonError(error);
            return;
        }

        router.post(`/my-publications/${selectedPublication.id}/appeal`, {
            reason: appealReason
        }, {
            onSuccess: () => {
                // Cerrar el modal primero
                handleCloseAppealModal();
                // Recargar la página usando Inertia para mantener el estado
                router.reload({ only: ['publications', 'flash'] });
            },
            onError: (errors) => {
                console.error('Error al enviar apelación:', errors);
                // Manejar errores de validación del backend
                if (errors?.reason) {
                    setAppealReasonError(Array.isArray(errors.reason) ? errors.reason[0] : errors.reason);
                } else if (errors?.error) {
                    setAppealReasonError(Array.isArray(errors.error) ? errors.error[0] : errors.error);
                } else {
                    setAppealReasonError('Error al enviar la apelación');
                }
            }
        });
    };

    const getStatusBadge = (publication: Publication) => {
        if (publication.is_hidden) {
            return (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Oculto por Moderación
                </Badge>
            );
        }

        return publication.status === 1 ? (
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
        <AppLayout breadcrumbs={[
            {
                title: 'Mis Publicaciones',
                href: '/my-publications',
            }]}>
            <Head title="Mis Publicaciones" />
            
            <div className="bg-gray-50 min-h-screen space-y-8 px-6 py-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                            <h1 className="text-3xl font-bold mb-2">Mis Publicaciones</h1>
                            <p className="text-blue-100 text-lg">Gestiona tus productos y servicios</p>
                            </div>
                        {auth.user.role !== 'comprador' && (
                        <Link href="/my-publications/create">
                            <Button variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Crear Publicación
                                    </Button>
                        </Link>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                                    Total Publicaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600 mb-2">{publications.data.length}</div>
                                <p className="text-sm text-gray-600">Registradas en el sistema</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Eye className="h-5 w-5 mr-2 text-green-600" />
                                    Habilitadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600 mb-2">
                                    {publications.data.filter(p => p.status === 1 && !p.is_hidden).length}
                                </div>
                                <p className="text-sm text-gray-600">Visibles al público</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3" >
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <EyeOff className="h-5 w-5 mr-2 text-red-600" />
                                    Inhabilitadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600 mb-2" >
                                    {publications.data.filter(p => p.status === 2).length}
                                </div>
                                <p className="text-sm text-gray-600">No visibles al público</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                                    Ocultas por Moderación
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-orange-600 mb-2">
                                    {publications.data.filter(p => p.is_hidden).length}
                                </div>
                                <p className="text-sm text-gray-600">En revisión o sancionadas</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Publications Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {publications.data.map((publication) => (
                            <div key={publication.id} data-testid="publication-card" className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
                                {/* Header con título y menú */}
                                <div className="p-5 pb-3">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <ConditionalTooltip
                                                content={publication.title}
                                                className="text-lg line-clamp-2 mb-3"
                                            >
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                                                {publication.title}
                                                </h3>
                                            </ConditionalTooltip>
                                            <div className="flex gap-2 mb-3">
                                                {getStatusBadge(publication)}
                                                {getTypeBadge(publication.type)}
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" data-testid="publication-menu" className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/my-publications/${publication.id}`} className="text-slate-700 dark:text-slate-300">
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver
                                                    </Link>
                                                </DropdownMenuItem>
                                                {!publication.is_hidden && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/my-publications/${publication.id}/edit`} className="text-slate-700 dark:text-slate-300">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                                )}
                                                {!publication.is_hidden && (
                                                <DropdownMenuItem 
                                                    onClick={() => handleToggleStatus(publication.id)}
                                                    className="text-slate-700 dark:text-slate-300"
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
                                                )}
                                                {publication.is_hidden && publication.can_appeal && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleAppeal(publication)}
                                                        className="text-orange-600 dark:text-orange-400"
                                                    >
                                                        <MessageSquare className="mr-2 h-4 w-4" />
                                                        Apelar Moderación
                                                    </DropdownMenuItem>
                                                )}
                                                {publication.is_hidden && !publication.can_appeal && (
                                                    <DropdownMenuItem
                                                        disabled
                                                        className="text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                    >
                                                        <MessageSquare className="mr-2 h-4 w-4" />
                                                        Apelar Moderación (No disponible)
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem 
                                                    onClick={() => handleDelete(publication.id)}
                                                    className="text-red-600 dark:text-red-400"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Imagen */}
                                <div className="relative mx-5 mb-4 h-40">
                                    <SmartThumbnail
                                                src={publication.images?.[0]?.image_url ? `${publication.images[0].image_url}` : "https://picsum.photos/300/200"}
                                                alt={publication.title}
                                        className="rounded-xl group-hover:scale-105 transition-transform duration-300"
                                            />
                                    <div className="absolute top-3 left-3">
                                        <Badge variant="secondary" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border border-gray-200/50 dark:border-slate-600/50">
                                                    {publication.category.name}
                                                </Badge>
                                            </div>
                                        </div>

                                {/* Contenido */}
                                <div className="px-5 pb-5 flex flex-col flex-grow">
                                    {/* Descripción */}
                                    <ConditionalTooltip
                                        content={publication.description || ''}
                                        className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4"
                                    >
                                        <p>
                                            {publication.description}
                                        </p>
                                    </ConditionalTooltip>

                                    {/* Ubicación */}
                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                                        <svg className="w-4 h-4 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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

                                    {/* Moderación */}
                                    {publication.is_hidden && publication.moderation_reason && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                                        {(publication as any).is_final_decision ? 'Decisión Final de Moderación:' : 'Motivo de ocultación:'}
                                                    </h4>
                                                    <p className="text-sm text-red-700 dark:text-red-300">
                                                        {publication.moderation_reason}
                                                    </p>
                                                    {publication.moderation_date && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                            {(publication as any).is_final_decision ? 'Decisión final el' : 'Oculto el'} {new Date(publication.moderation_date).toLocaleDateString()}
                                                        </p>
                                                    )}
                                            </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Precio y fecha */}
                                    <div className="mt-auto pt-2 border-t border-gray-100 dark:border-slate-700">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${publication.price}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Publicado</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {new Date(publication.published_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginación - Solo visible cuando hay publicaciones */}
                    {publications.data && publications.data.length > 0 && publications.links && publications.links.length > 0 && (
                        <div className="flex justify-center mt-8">
                            <div className="flex items-center gap-2">
                                {publications.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${link.active 
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
                        <EmptyState
                            icon={Plus}
                            title="No tienes publicaciones"
                            description="Comienza creando tu primera publicación"
                            buttonText="Crear Primera Publicación"
                            buttonHref="/my-publications/create"
                            buttonIcon={Plus}
                            buttonVariant="default"
                            buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
                        />
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
            <GeneralModal
                isOpen={showAppealModal}
                onClose={handleCloseAppealModal}
                title="Apelar Moderación"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Si crees que tu publicación fue ocultada incorrectamente, puedes apelar esta decisión.
                        Proporciona un motivo detallado para tu apelación.
                    </p>

                    {selectedPublication && (
                        <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-1">Publicación:</h4>
                            <p className="text-sm text-gray-600">{selectedPublication.title}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo de la apelación <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={appealReason}
                            onChange={handleAppealReasonChange}
                            onBlur={() => {
                                const error = validateAppealReason(appealReason);
                                setAppealReasonError(error);
                            }}
                            rows={4}
                            maxLength={APPEAL_REASON_MAX_LENGTH}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                appealReasonError ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Explica por qué crees que tu publicación debería ser restaurada..."
                            required
                        />
                        <div className="flex items-center justify-between mt-1">
                            <div>
                                {appealReasonError && (
                                    <p className="text-sm text-red-600 mt-1">{appealReasonError}</p>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                {appealReason.length} / {APPEAL_REASON_MAX_LENGTH} caracteres
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleSubmitAppeal}
                            disabled={!!appealReasonError || !appealReason.trim()}
                            className={`flex-1 font-semibold py-2 px-4 rounded-lg transition ${
                                appealReasonError || !appealReason.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                        >
                            Enviar Apelación
                        </button>
                        <button
                            type="button"
                            onClick={handleCloseAppealModal}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </GeneralModal>
        </AppLayout>
    );
}

// Componente principal
export default function MyPublications() {
    return <MyPublicationsContent />;
}

