import { publicationView } from "@/routes";
import { Publication, SharedData } from "@/types";
import { Link, router, usePage } from "@inertiajs/react";
import { useState, useEffect } from "react";
import ReportModal from "./report-modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Heart } from "lucide-react";
import SmartThumbnail from "../ui/smart-thumbnail";

interface PublicationCardProps {
    publication: Publication;
}

export default function PublicationCard({ publication }: PublicationCardProps) {
    const { url, auth } = usePage<SharedData>().props;
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    
    // Determinar el parámetro 'from' basado en la URL actual
    const getFromParam = () => {
        if (url && (url as string).includes('/favorites')) {
            return 'favorites';
        } else if (url && (url as string).includes('/my-publications')) {
            return 'my-publications';
        }
        return null;
    };

    // Verificar si la publicación está en favoritos al cargar
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            try {
                const response = await fetch(`/favorites/check/${publication.id}`);
                const data = await response.json();
                setIsFavorite(data.isFavorite);
            } catch (error) {
                console.error('Error checking favorite status:', error);
                setIsFavorite(false);
            }
        };

        checkFavoriteStatus();
    }, [publication.id]);

    const handleReportClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsReportModalOpen(true);
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isFavorite) {
            // Quitar de favoritos
            router.delete(`/favorites/${publication.id}`, {
                onSuccess: () => {
                    setIsFavorite(false);
                }
            });
        } else {
            // Agregar a favoritos
            router.post(`/favorites/${publication.id}`, {}, {
                onSuccess: () => {
                    setIsFavorite(true);
                }
            });
        }
    };

    return (
            <div className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
            {/* Imagen del producto */}
            <div className="relative overflow-hidden h-48">
                <SmartThumbnail
                    src={publication.images && publication.images.length > 0
                        ? `/storage/${publication.images[0].image_url}`
                        : "https://picsum.photos/300/200"}
                    alt={publication.title}
                    className="group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Overlay con gradiente sutil */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Badge de categoría - esquina superior izquierda */}
                <div className="absolute top-3 left-3 z-20">
                    <span className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border border-gray-200/50 dark:border-slate-600/50">
                        {publication.category.name}
                    </span>
                </div>

                {/* Botón de reportar - esquina superior derecha */}
                {publication.created_by !== auth?.user?.id && (
                <div className="absolute top-3 right-3 z-20">
                    <button
                        onClick={handleReportClick}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 p-2 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm border border-gray-200/50 dark:border-slate-600/50"
                        title="Reportar publicación"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </button>
                </div>
                )}

                {/* Botón de favoritos - esquina inferior izquierda */}
                {auth.user.role !== 'moderador' && (
                    <div className="absolute bottom-3 left-3 z-20">
                        <button
                            onClick={handleFavoriteClick}
                            className={`p-2.5 rounded-full transition-all duration-200 shadow-sm border backdrop-blur-sm ${
                                isFavorite 
                                    ? 'bg-red-500 text-white border-red-500/20 hover:bg-red-600' 
                                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-gray-200/50 dark:border-slate-600/50 hover:text-red-500 dark:hover:text-red-400'
                            }`}
                            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                        >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                )}
            </div>

            {/* Contenido de la card */}
            <div className="p-5 flex flex-col flex-grow">
                {/* Título */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-3 line-clamp-2 cursor-help leading-tight">
                            {publication.title}
                        </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="whitespace-normal break-words">{publication.title}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Ubicación con icono */}
                <div className="flex items-center mb-4">
                    <svg className="w-4 h-4 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-slate-600 dark:text-slate-400 text-sm truncate cursor-help flex-1 min-w-0">
                                {publication.location || 'Ubicación no disponible'}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="whitespace-normal break-words">{publication.location || 'Ubicación no disponible'}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Precio y estado - siempre al final */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                    <div className="flex flex-col">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 cursor-help">${publication.price}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Precio: ${publication.price}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <span className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors duration-200 ${
                        publication.disponibility 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                    }`}>
                        {publication.disponibility ? 'Disponible' : 'No disponible'}
                    </span>
                </div>
            </div>

            {/* Link wrapper para hacer toda la card clickeable */}
            <Link 
                href={`${publicationView(publication.id).url}${getFromParam() ? `?from=${getFromParam()}` : ''}`} 
                className="absolute inset-0 z-10" 
                style={{pointerEvents: isReportModalOpen ? 'none' : 'auto'}}
            />

            {/* Modal de reporte */}
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                publicationId={publication.id}
                publicationTitle={publication.title}
            />
        </div>
    );
}
