import AppLayout from "@/layouts/app-layout";
import { publicationView } from "@/routes";
import { BreadcrumbItem, Publication } from "@/types";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import MiniMap from "@/components/publications/MiniMap";

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

    // Estado para el carrusel de imágenes
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Array de imágenes (puedes expandir esto con más imágenes)
    const images = [
        publication.image || "https://picsum.photos/800/600",
        "https://picsum.photos/800/601",
        "https://picsum.photos/800/602",
        "https://picsum.photos/800/603"
    ];

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };
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
                                className="absolute top-0 left-0 z-10 inline-flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            
                            <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
                                <div className="relative group">
                                    <img
                                        src={images[currentImageIndex]}
                                        alt={publication.title}
                                        className="w-full h-80 sm:h-96 lg:h-[510px] xl:h-[560px] object-cover transition-opacity duration-300"
                                    />
                                    
                                    {/* Controles del carrusel */}
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-card/80 hover:bg-card text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-card/80 hover:bg-card text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                    
                                    {/* Indicadores del carrusel */}
                                    {images.length > 1 && (
                                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                            {images.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                                        index === currentImageIndex 
                                                            ? 'bg-card' 
                                                            : 'bg-card/50 hover:bg-card/75'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-card/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                            {publication.category.name}
                                        </span>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${
                                            publication.status === 1 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-red-500 text-white'
                                        }`}>
                                            {publication.status === 1 ? "Disponible" : "No disponible"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna derecha - Información */}
                        <div className="flex flex-col space-y-6 justify-start">
                            {/* Card de precio */}
                            <div className="bg-card rounded-2xl shadow-lg p-6">
                                <div className="text-center mb-6">
                                    <div className="text-4xl font-bold text-foreground mb-2">
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
                            <div className="bg-card rounded-2xl shadow-lg p-6 flex flex-col">
                                <h3 className="font-bold text-foreground mb-4 text-lg">Detalles del Producto</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground text-sm font-medium">Tipo:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            publication.type === 'servicio' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {publication.type}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground text-sm font-medium">Código:</span>
                                        <span className="text-foreground font-mono text-sm">{publication.code}</span>
                                    </div>
                                    {publication.horario && (
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-muted-foreground text-sm font-medium">Horario:</span>
                                            <span className="text-foreground text-sm">
                                                {publication.horario}
                                            </span>
                                        </div>
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
                                <p className="text-gray-700 leading-relaxed text-base">
                                    {publication.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mapa de ubicación */}
                    {publication.location_point && (
                        <div className="mt-8">
                            <div className="bg-card rounded-2xl shadow-lg p-6">
                                <h2 className="text-lg font-semibold text-foreground mb-4">Ubicación</h2>
                                <MiniMap
                                    lat={publication.location_point.lat}
                                    lng={publication.location_point.lng}
                                    location={publication.location}
                                    className="h-64 w-full"
                                />
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
        </AppLayout>
    )
}