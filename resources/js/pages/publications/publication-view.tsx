import AppLayout from "@/layouts/app-layout";
import { publicationView } from "@/routes";
import { BreadcrumbItem, Publication, SharedData } from "@/types";
import { Head, Link, usePage, router } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import MiniMap from "@/components/publications/MiniMap";
import ReportModal from "@/components/publications/report-modal";
import ImageGallery from "@/components/publications/ImageGallery";
import HeightSync from "@/components/layout/HeightSync";
import PurchaseConfirmationModal from "@/components/publications/purchase-confirmation-modal";

interface PublicationViewProps {
    publication: Publication
}

export default function PublicationView({ publication }: PublicationViewProps) {
    const { url, auth } = usePage<SharedData>().props;
    
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: `${publication.category.name}/${publication.title}`,
            href: publicationView(publication).url,
        },
    ];

    // Estado para los modales
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    
    // Determinar la URL de regreso basada en el referrer o parámetros
    const getBackUrl = () => {
        // Verificar si hay un parámetro 'from' en la URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get('from');
        
        if (from === 'favorites') {
            return '/favorites';
        } else if (from === 'my-publications') {
            return '/my-publications';
        }
        
        // Si no hay parámetro, usar el referrer
        if (document.referrer) {
            if (document.referrer.includes('/favorites')) {
                return '/favorites';
            } else if (document.referrer.includes('/my-publications')) {
                return '/my-publications';
            }
        }
        
        // Por defecto, regresar a publicaciones
        return '/publication';
    };
    
    // Verificar si la publicación está en favoritos al cargar
    useEffect(() => {
        if (auth.user) {
            const checkFavoriteStatus = async () => {
                try {
                    // Usar AbortController para cancelar requests anteriores
                    const controller = new AbortController();
                    const response = await fetch(`/favorites/check/${publication.id}`, {
                        signal: controller.signal,
                        cache: 'no-cache', // Evitar cache
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });
                    const data = await response.json();
                    setIsFavorite(data.isFavorite);
                } catch (error) {
                    if (error instanceof Error && error.name !== 'AbortError') {
                        console.error('Error checking favorite status:', error);
                        setIsFavorite(false);
                    }
                }
            };

            // Ejecutar inmediatamente
            checkFavoriteStatus();
        }
    }, [publication.id, auth.user]);

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!auth.user) {
            router.visit('/login');
            return;
        }
        
        // Actualizar estado inmediatamente para mejor UX
        const newFavoriteState = !isFavorite;
        setIsFavorite(newFavoriteState);
        
        if (newFavoriteState) {
            // Agregar a favoritos
            router.post(`/favorites/${publication.id}`, {}, {
                onSuccess: () => {
                    // Estado ya actualizado
                },
                onError: () => {
                    // Revertir estado si hay error
                    setIsFavorite(false);
                }
            });
        } else {
            // Quitar de favoritos
            router.delete(`/favorites/${publication.id}`, {
                onSuccess: () => {
                    // Estado ya actualizado
                },
                onError: () => {
                    // Revertir estado si hay error
                    setIsFavorite(true);
                }
            });
        }
    };

    const handlePurchaseConfirm = () => {
        setIsPurchasing(true);
        router.post(`/publication/${publication.id}/buy`, {}, {
            onSuccess: () => {
                // Recargar la página para mostrar el estado actualizado
                window.location.reload();
            },
            onError: (errors) => {
                setIsPurchasing(false);
                console.error('Error en compra:', errors);
            }
        });
    };
    
    // Array de imágenes reales de la base de datos
    const images = publication.images && publication.images.length > 0 
        ? publication.images.map(img => `${img.image_url}`)
        : [];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={publication.title} />

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                    {/* Flecha de regreso - fuera del grid */}
                    <div className="mb-2">
                        <Link
                            href={getBackUrl()}
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Columna izquierda - Imagen */}
                        <div className="lg:col-span-2">
                            {/* ✅ Sincroniza solo el bloque visual */}
                            <HeightSync syncWith="#public-detail-panel" enableFrom="lg" minHeight={360} maxHeight={900}>
                                <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full">
                                    <div className="relative h-full">
                                        <ImageGallery 
                                            images={images}
                                            title={publication.title}
                                            className="w-full h-full"
                                        />
                                    
                                    {/* Badges superpuestos */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                            {publication.category.name}
                                        </span>
                                    </div>
                                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${
                                            publication.disponibility 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-red-500 text-white'
                                        }`}>
                                            {publication.disponibility ? "Disponible" : "No disponible"}
                                        </span>
                                        {publication.created_by !== auth.user?.id && (
                                        <button
                                            onClick={() => setIsReportModalOpen(true)}
                                            className="bg-gray-800 bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all duration-200"
                                            title="Reportar publicación"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </HeightSync>
                        </div>

                        {/* Columna derecha - Información */}
                        <div id="public-detail-panel" className="flex flex-col space-y-6 justify-start">
                            {/* Card de precio */}
                            <div className="bg-card rounded-2xl shadow-lg p-6">
                                <div className="text-center mb-6">
                                    <div className="text-4xl font-bold text-foreground mb-2">
                                        ${publication.price}
                                    </div>
                                    <div className="text-sm text-gray-500">Precio final</div>
                                </div>
                                <div className="space-y-3">
                                    {publication.created_by !== auth.user?.id ? (
                                        // No es mi publicación
                                        publication.disponibility ? (
                                            // Producto disponible - Mostrar botón de comprar
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsPurchaseModalOpen(true);
                                                }}
                                                disabled={isPurchasing}
                                                className={`w-full font-semibold py-3 px-6 rounded-xl transition ${
                                                    isPurchasing 
                                                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                                }`}
                                            >
                                                {isPurchasing ? 'Procesando...' : 'Comprar'}
                                            </button>
                                        ) : (
                                            // Producto vendido
                                            <button disabled className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl cursor-not-allowed">
                                                Vendido
                                            </button>
                                        )
                                    ) : (
                                        // Es mi publicación
                                        <button disabled className="w-full bg-gray-300 text-gray-600 font-semibold py-3 px-6 rounded-xl cursor-not-allowed">
                                            Mi Publicación
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleFavoriteClick}
                                        className={`w-full font-semibold py-3 px-6 rounded-xl transition ${
                                            isFavorite 
                                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {isFavorite ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}
                                    </button>
                                </div>
                            </div>

                            {/* Card de detalles */}
                            <div className="bg-card rounded-2xl shadow-lg p-6 flex flex-col">
                                <h3 className="font-bold text-foreground mb-4 text-lg">Detalles del Producto</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground text-sm font-medium">Tipo:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            publication.type === 'servicio' 
                                                ? 'border border-purple-200 text-purple-800 bg-purple-50' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {publication.type}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground text-sm font-medium">Código:</span>
                                        <span className="text-foreground font-mono text-sm">{publication.code}</span>
                                    </div>
                                    {publication.type === 'servicio' && (
                                        publication.serviceHours && publication.serviceHours.length > 0 ? (
                                            <div className="flex justify-between items-start py-2">
                                                <span className="text-gray-600 text-sm font-medium">Horario:</span>
                                                <div className="text-gray-900 text-sm text-right max-w-xs">
                                                    {(() => {
                                                        const dayNames = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                                                        
                                                        // Agrupar por horario
                                                        const scheduleByTime: { [key: string]: number[] } = {};
                                                        publication.serviceHours.forEach(hour => {
                                                            const timeKey = `${hour.open_time.slice(0, 5)}-${hour.close_time.slice(0, 5)}`;
                                                            if (!scheduleByTime[timeKey]) {
                                                                scheduleByTime[timeKey] = [];
                                                            }
                                                            scheduleByTime[timeKey].push(hour.day_of_week);
                                                        });

                                                        // Formatear cada grupo de horario
                                                        const formatTimeGroup = (timeKey: string, days: number[]) => {
                                                            const sortedDays = days.sort((a, b) => a - b);
                                                            
                                                            // Agrupar días consecutivos
                                                            const ranges: string[] = [];
                                                            let start = sortedDays[0];
                                                            let end = start;
                                                            
                                                            for (let i = 1; i < sortedDays.length; i++) {
                                                                if (sortedDays[i] === end + 1) {
                                                                    end = sortedDays[i];
                                                                } else {
                                                                    // Finalizar rango actual
                                                                    if (start === end) {
                                                                        ranges.push(dayNames[start]);
                                                                    } else {
                                                                        ranges.push(`${dayNames[start]} - ${dayNames[end]}`);
                                                                    }
                                                                    start = sortedDays[i];
                                                                    end = start;
                                                                }
                                                            }
                                                            
                                                            // Agregar último rango
                                                            if (start === end) {
                                                                ranges.push(dayNames[start]);
                                                            } else {
                                                                ranges.push(`${dayNames[start]} - ${dayNames[end]}`);
                                                            }
                                                            
                                                            return `${ranges.join(', ')}/${timeKey}`;
                                                        };

                                                        return Object.keys(scheduleByTime)
                                                            .map(timeKey => formatTimeGroup(timeKey, scheduleByTime[timeKey]))
                                                            .join(', ');
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-start py-2">
                                            <span className="text-gray-600 text-sm font-medium">Horario:</span>
                                                <div className="text-gray-900 text-sm text-right max-w-xs">
                                                    No especificado
                                                </div>
                                        </div>
                                        )
                                    )}
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground text-sm font-medium">Publicado:</span>
                                        <span className="text-foreground text-sm">
                                            {new Date(publication.published_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección de descripción - debajo de la imagen */}
                    <div className="mt-8">
                        <div className="bg-card rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-foreground mb-3">Descripción</h2>
                            <div className="prose prose-gray max-w-none">
                                <p className="text-gray-700 leading-relaxed text-base break-words whitespace-pre-wrap">
                                    {publication.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mapa de ubicación */}
                    {(publication.location_point || publication.location) && (
                        <div className="mt-8">
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h2>
                                {publication.location_point ? (
                                    <MiniMap
                                        lat={publication.location_point.lat}
                                        lng={publication.location_point.lng}
                                        location={publication.location}
                                        className="h-64 w-full"
                                    />
                                ) : (
                                    <div className="h-64 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-4xl text-gray-400 mb-2">📍</div>
                                            <p className="text-gray-600 font-medium">{publication.location}</p>
                                            <p className="text-gray-400 text-sm">Ubicación sin coordenadas específicas</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Información del vendedor - al final */}
                    <div className="mt-8">
                        <div className="bg-card rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-foreground mb-4">Información del Vendedor</h2>
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-lg">
                                        {publication.user.name?.charAt(0) || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{publication.user.name}</div>
                                    <div className="text-sm text-gray-500">Vendedor verificado</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Miembro desde {new Date(publication.published_at).getFullYear()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Modal de reporte */}
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                publicationId={publication.id}
                publicationTitle={publication.title}
            />

            {/* Modal de confirmación de compra */}
            <PurchaseConfirmationModal
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onConfirm={handlePurchaseConfirm}
                isPurchasing={isPurchasing}
                publicationTitle={publication.title}
                price={publication.price}
            />
        </AppLayout>
    )
}