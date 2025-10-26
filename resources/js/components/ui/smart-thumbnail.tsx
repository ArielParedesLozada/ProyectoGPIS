import { useState, useRef, useEffect } from "react";

interface SmartThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SmartThumbnail({
  src,
  alt,
  className = "",
  style = {},
}: SmartThumbnailProps) {
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

    const handleLoad = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      
      // Lógica inteligente para miniaturas
      if (aspectRatio > 1.2) {
        // Imagen muy horizontal → usar cover para llenar
        setImageStyle({
          objectFit: "cover",
          backgroundColor: "transparent",
        });
      } else if (aspectRatio < 0.8) {
        setImageStyle({
          objectFit: "contain",
          backgroundColor: "#f3f4f6",
        });
      } else {
        setImageStyle({
          objectFit: "cover",
          backgroundColor: "transparent",
        });
      }
    };

    if (img.complete) {
      handleLoad();
    } else {
      img.addEventListener("load", handleLoad);
    }
    return () => img.removeEventListener("load", handleLoad);
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      draggable={false}
      className={`w-full h-full ${className}`}
      style={{
        objectFit: imageStyle.objectFit,
        backgroundColor: imageStyle.backgroundColor,
        ...style,
      }}
    />
  );
}
