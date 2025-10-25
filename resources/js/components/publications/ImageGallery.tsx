import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import SmartImage from "../ui/smart-image";

interface ImageGalleryProps {
    images: string[];
    title: string;
    className?: string;
    zoom?: number; // nivel de zoom (2 = 200%)
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
    images,
    title,
    className = "",
    zoom = 2,
}) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [bgPos, setBgPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset al cambiar listado de imágenes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [images]);

    const hasImages = images && images.length > 0;

    const currentSrc = useMemo(
        () => (hasImages ? images[currentImageIndex] : ""),
        [hasImages, images, currentImageIndex]
    );

    // Recalcula tamaño contenedor (para % precisos)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect;
            setContainerSize({ w: rect.width, h: rect.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

    const computeBgPos = useCallback(
        (clientX: number, clientY: number) => {
            const el = containerRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const x = clamp(clientX - rect.left, 0, rect.width);
            const y = clamp(clientY - rect.top, 0, rect.height);

            // Convertimos a % del contenedor
            const px = (x / rect.width) * 100;
            const py = (y / rect.height) * 100;

            // Sin márgenes “protectores”: deja recorrer todo el ancho/alto
            setBgPos({ x: px, y: py });
        },
        []
    );

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        computeBgPos(e.clientX, e.clientY);
    };

    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        // Usamos el primer toque
        const t = e.touches[0];
        if (t) computeBgPos(t.clientX, t.clientY);
    };

    const nextImage = useCallback(() => {
        if (!hasImages) return;
        setCurrentImageIndex((p) => (p + 1) % images.length);
    }, [hasImages, images]);

    const prevImage = useCallback(() => {
        if (!hasImages) return;
        setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);
    }, [hasImages, images]);

    // Navegación con teclado
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextImage();
            if (e.key === "ArrowLeft") prevImage();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [nextImage, prevImage]);

    if (!hasImages) {
        return (
            <div className={`bg-gray-200 rounded-lg flex items-center justify-center ${className}`}>
                <div className="text-center p-8">
                    <div className="text-6xl text-gray-400 mb-4">📷</div>
                    <p className="text-gray-500 text-lg">Sin imágenes</p>
                    <p className="text-gray-400 text-sm">Esta publicación no tiene imágenes</p>
                </div>
            </div>
        );
    }

    // Calcula background-size según zoom y proporción contenedor
    // Estrategia: usamos cover en zoom 1 y multiplicamos por "zoom" para el efecto
    const bgSize = `${zoom * 100}% ${zoom * 100}%`;

    return (
        <div className={`relative ${className}`}>
            {/* Contenedor principal con fondo movible (zoom estable) */}
            <div
                ref={containerRef}
                className="relative group bg-white rounded-lg overflow-hidden shadow-lg"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onMouseMove={onMouseMove}
                onTouchStart={() => setIsHovering(true)}
                onTouchEnd={() => setIsHovering(false)}
                onTouchMove={onTouchMove}
                role="img"
                aria-label={`${title} - Imagen ${currentImageIndex + 1}`}
            >
                <div className="relative w-full h-80 sm:h-96 lg:h-[510px] xl:h-[560px] overflow-hidden">
                    <SmartImage
                        src={currentSrc}
                        alt={`${title} - Imagen ${currentImageIndex + 1}`}
                        className="w-full h-full transition-transform duration-100 ease-linear"
                        style={{
                            transform: isHovering ? `scale(${zoom})` : "scale(1)",
                            transformOrigin: isHovering ? `${bgPos.x}% ${bgPos.y}%` : "center",
                            cursor: isHovering ? "zoom-in" : "default",
                            willChange: "transform",
                        }}
                    />
                </div>

                {/* Botones navegación */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            aria-label="Imagen anterior"
                            className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
                                }`}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={nextImage}
                            aria-label="Imagen siguiente"
                            className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
                                }`}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}

                {/* Indicador zoom */}
                {isHovering && (
                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                        <ZoomIn className="h-4 w-4" />
                        {`${Math.round(zoom * 100)}%`}
                    </div>
                )}
            </div>

            {/* Miniaturas */}
            {images.length > 1 && (
                <div className="mt-4 flex justify-center">
                    <div className="flex gap-2 overflow-x-auto pb-2 max-w-full" role="listbox" aria-label="Miniaturas">
                        {images.map((image, index) => {
                            const selected = index === currentImageIndex;
                            return (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    role="option"
                                    aria-selected={selected}
                                    aria-label={`${title} - Miniatura ${index + 1}`}
                                >
                                    {/* Usamos <img> normal en thumbs con lazy */}
                                    <img
                                        src={image}
                                        alt={`${title} - Miniatura ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGallery;
