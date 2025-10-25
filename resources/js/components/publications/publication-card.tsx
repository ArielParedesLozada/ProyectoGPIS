import { publicationView } from "@/routes";
import { Publication } from "@/types";
import { Link, router, usePage } from "@inertiajs/react";
import { useState, useEffect } from "react";
import ReportModal from "./report-modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Heart } from "lucide-react";

interface PublicationCardProps {
    publication: Publication;
}

export default function PublicationCard({ publication }: PublicationCardProps) {
    const { url } = usePage();
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    
    // Determinar el parámetro 'from' basado en la URL actual
    const getFromParam = () => {
        if (url.includes('/favorites')) {
            return 'favorites';
        } else if (url.includes('/my-publications')) {
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
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden h-full flex flex-col relative group">
            <div>
                <div className="bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col">
                    {/* Imagen del producto */}
                    <div className="relative">
                        <img
                            src={publication.images && publication.images.length > 0
                                ? `/storage/${publication.images[0].image_url}`
                                : "https://picsum.photos/300/200"}
                            alt={publication.title}
                            className="w-full h-48 object-cover"
                        />
                        {/* Badge de categoría - esquina superior izquierda */}
                        <div className="absolute top-3 left-3">
                            <span className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                                {publication.category.name}
                            </span>
                        </div>

                        {/* Botón de reportar - esquina superior derecha */}
                        <div className="absolute top-3 right-3 z-10">
                            <button
                                onClick={handleReportClick}
                                className="bg-gray-800 bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Reportar publicación"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </button>
                        </div>
                                            <div className="absolute bottom-3 left-3 z-10">
                        <button
                            onClick={handleFavoriteClick}
                            className={`p-2 rounded-full transition-all duration-200 ${
                                isFavorite 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100'
                            }`}
                            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                        >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                    </div>

                    </div>

                    {/* Contenido de la card */}
                    <div className="p-4 flex flex-col flex-grow">
                        {/* Título */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 cursor-help">
                                    {publication.title}
                                </h3>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="whitespace-normal break-words">{publication.title}</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Ubicación con icono */}
                        <div className="flex items-center mb-2">
                            <svg className="w-4 h-4 text-red-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-gray-500 text-sm truncate cursor-help flex-1 min-w-0">
                                        {publication.location || 'Ubicación no disponible'}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="whitespace-normal break-words">{publication.location || 'Ubicación no disponible'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Precio y botón - siempre al final */}
                        <div className="flex items-center justify-between mt-auto">
                            <div className="mb-3">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <p className="text-2xl font-bold text-gray-900 cursor-help">${publication.price}</p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Precio: ${publication.price}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <button className="bg-green-500 text-white px-3 py-1 rounded text-sm font-medium">
                                Disponible
                            </button>
                        </div>
                    </div>

                {/* Link wrapper para hacer toda la card clickeable */}
                <Link 
                    href={`${publicationView(publication.id).url}${getFromParam() ? `?from=${getFromParam()}` : ''}`} 
                    className="absolute inset-0 z-0" 
                    style={{pointerEvents: isReportModalOpen ? 'none' : 'auto'}}
                ></Link>
                </div>
            </div>

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
