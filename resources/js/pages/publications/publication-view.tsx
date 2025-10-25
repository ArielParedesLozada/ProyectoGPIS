import AppLayout from "@/layouts/app-layout";
import { publicationView } from "@/routes";
import { BreadcrumbItem, Publication } from "@/types";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import MiniMap from "@/components/publications/MiniMap";
import ReportModal from "@/components/publications/report-modal";
import ImageGallery from "@/components/publications/ImageGallery";

interface PublicationViewProps {
    publication: Publication
}

export default function PublicationView({ publication }: PublicationViewProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: `${publication.category.name}/${publication.title}`,
            href: publicationView(publication).url,
        },
    ];

    // Estado para el modal de reporte
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    
    // Array de imágenes reales de la base de datos
    const images = publication.images && publication.images.length > 0 
        ? publication.images.map(img => `/storage/${img.image_url}`)
        : [];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={publication.title} />

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Columna izquierda - Imagen */}
                        <div className="lg:col-span-2">
                            {/* Flecha de regreso - posicionada absolutamente */}
                            <Link
                                href="/publication"
                                className="absolute top-0 left-0 z-10 inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                <div className="relative">
                                    <ImageGallery 
                                        images={images}
                                        title={publication.title}
                                        className="w-full"
                                    />
                                    
                                    {/* Badges superpuestos */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                            {publication.category.name}
                                        </span>
                                    </div>
                                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${
                                            publication.status === 1 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-red-500 text-white'
                                        }`}>
                                            {publication.status === 1 ? "Disponible" : "No disponible"}
                                        </span>
                                        <button
                                            onClick={() => setIsReportModalOpen(true)}
                                            className="bg-gray-800 bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all duration-200"
                                            title="Reportar publicación"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna derecha - Información */}
                        <div className="flex flex-col space-y-6 justify-start">
                            {/* Card de precio */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="text-center mb-6">
                                    <div className="text-4xl font-bold text-gray-900 mb-2">
                                        ${publication.price}
                                    </div>
                                    <div className="text-sm text-gray-500">Precio final</div>
                                </div>
                                <div className="space-y-3">
                                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition">
                                        Contactar Vendedor
                                    </button>
                                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition">
                                        Agregar a Favoritos
                                    </button>
                                </div>
                            </div>

                            {/* Card de detalles */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Detalles del Producto</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600 text-sm font-medium">Tipo:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            publication.type === 'servicio' 
                                                ? 'border border-purple-200 text-purple-800 bg-purple-50' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {publication.type}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600 text-sm font-medium">Código:</span>
                                        <span className="text-gray-900 font-mono text-sm">{publication.code}</span>
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
                                        <span className="text-gray-600 text-sm font-medium">Publicado:</span>
                                        <span className="text-gray-900 text-sm">
                                            {new Date(publication.published_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección de descripción - debajo de la imagen */}
                    <div className="mt-8">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
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
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Vendedor</h2>
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-lg">
                                        {publication.user.name?.charAt(0) || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{publication.user.name}</div>
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
        </AppLayout>
    )
}