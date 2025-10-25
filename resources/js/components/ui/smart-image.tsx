import { useState, useRef, useEffect } from "react";

interface SmartImageProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
}

export default function SmartImage({ src, alt, className = "", style = {} }: SmartImageProps) {
    const [imageStyle, setImageStyle] = useState({
        objectFit: 'cover' as 'cover' | 'contain',
        backgroundColor: 'transparent'
    });
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const handleLoad = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            // Si la imagen es más alta que ancha (ratio < 1), usar contain
            // Si es más ancha que alta (ratio >= 1), usar cover
            if (aspectRatio < 1) {
                setImageStyle({
                    objectFit: 'contain',
                    backgroundColor: '#f3f4f6'
                });
            } else {
                setImageStyle({
                    objectFit: 'cover',
                    backgroundColor: 'transparent'
                });
            }
        };

        // Si la imagen ya está cargada
        if (img.complete) {
            handleLoad();
        } else {
            img.addEventListener('load', handleLoad);
        }

        return () => {
            img.removeEventListener('load', handleLoad);
        };
    }, [src]);

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={className}
            style={{
                objectFit: imageStyle.objectFit,
                backgroundColor: imageStyle.backgroundColor,
                ...style
            }}
        />
    );
}
