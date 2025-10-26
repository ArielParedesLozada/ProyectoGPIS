import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import SmartImage from "../ui/smart-image";
import SmartThumbnail from "../ui/smart-thumbnail";

interface ImageGalleryProps {
  images: string[];
  title: string;
  className?: string;
  zoom?: number;
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCurrentImageIndex(0); }, [images]);

  const hasImages = images && images.length > 0;
  const currentSrc = useMemo(
    () => (hasImages ? images[currentImageIndex] : ""),
    [hasImages, images, currentImageIndex]
  );

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

  const computeBgPos = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    setBgPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => computeBgPos(e.clientX, e.clientY);
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]; if (t) computeBgPos(t.clientX, t.clientY);
  };

  const nextImage = useCallback(() => { if (hasImages) setCurrentImageIndex(p => (p + 1) % images.length); }, [hasImages, images]);
  const prevImage = useCallback(() => { if (hasImages) setCurrentImageIndex(p => (p - 1 + images.length) % images.length); }, [hasImages, images]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft")  prevImage();
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

  return (
    <div className={`relative ${className}`}>
      {/* Hacemos la tarjeta en columna para que el viewport crezca y
          las miniaturas queden al fondo sin dejar huecos */}
      <div
        className="relative group bg-white rounded-lg overflow-hidden shadow-lg h-full flex flex-col"
      >
        {/* Viewport principal: crece todo lo posible */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 w-full overflow-hidden"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onMouseMove={onMouseMove}
          onTouchStart={() => setIsHovering(true)}
          onTouchEnd={() => setIsHovering(false)}
          onTouchMove={onTouchMove}
          role="img"
          aria-label={`${title} - Imagen ${currentImageIndex + 1}`}
        >
          <SmartImage
            src={currentSrc}
            alt={`${title} - Imagen ${currentImageIndex + 1}`}
            fit="auto"
            style={{
              transform: isHovering ? `scale(${zoom})` : "scale(1)",
              transformOrigin: isHovering ? `${bgPos.x}% ${bgPos.y}%` : "center",
              cursor: isHovering ? "zoom-in" : "default",
              willChange: "transform",
            }}
          />

          {/* Navegación */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                aria-label="Imagen anterior"
                className={`absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                aria-label="Imagen siguiente"
                className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Indicador de zoom */}
          {isHovering && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              {`${Math.round(zoom * 100)}%`}
            </div>
          )}
        </div>

        {/* Miniaturas – quedan pegadas abajo, sin dejar huecos */}
        {images.length > 1 && (
          <div className="border-t border-gray-100 bg-white">
            <div className="px-4 py-3 flex justify-center">
              <div className="flex gap-2 overflow-x-auto max-w-full" role="listbox" aria-label="Miniaturas">
                {images.map((image, index) => {
                  const selected = index === currentImageIndex;
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"}`}
                      role="option"
                      aria-selected={selected}
                      aria-label={`${title} - Miniatura ${index + 1}`}
                    >
                      <SmartThumbnail
                        src={image}
                        alt={`${title} - Miniatura ${index + 1}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGallery;