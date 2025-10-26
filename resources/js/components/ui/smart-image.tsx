import { useState, useRef, useEffect } from "react";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;

  /** Autoswitch por relación de aspecto o forzar */
  fit?: "auto" | "contain" | "cover";

  /** Fondo cuando usamos contain (bandas) */
  backdropColor?: string;
}

export default function SmartImage({
  src,
  alt,
  className = "",
  style = {},
  fit = "auto",
  backdropColor = "transparent",
}: SmartImageProps) {
  const [imageStyle, setImageStyle] = useState<{
    objectFit: "cover" | "contain";
    backgroundColor: string;
  }>({
    objectFit: "cover",
    backgroundColor: "transparent",
  });

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (fit !== "auto") {
      setImageStyle({ objectFit: fit, backgroundColor: backdropColor });
      return;
    }

    const handleLoad = () => {
      const r = img.naturalWidth / img.naturalHeight;
      if (r > 1.1) {
        // Horizontal → llenar
        setImageStyle({ objectFit: "cover", backgroundColor: "transparent" });
      } else if (r < 0.9) {
        // Vertical → mostrar completa
        setImageStyle({ objectFit: "contain", backgroundColor: "#f3f4f6" });
      } else {
        // Cuadrada o intermedia
        setImageStyle({ objectFit: "cover", backgroundColor: "transparent" });
      }
    };

    if (img.complete) handleLoad();
    else img.addEventListener("load", handleLoad);
    return () => img.removeEventListener("load", handleLoad);
  }, [src, fit, backdropColor]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      draggable={false}
      className={`block w-full h-full ${className}`}
      style={{
        objectFit: imageStyle.objectFit,
        backgroundColor: imageStyle.backgroundColor,

        // Passthrough útil para el zoom del viewer
        transform: style?.transform,
        transformOrigin: style?.transformOrigin,
        cursor: style?.cursor,
        willChange: style?.willChange,
      }}
    />
  );
}