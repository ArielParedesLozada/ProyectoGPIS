import React, { useEffect, useState, useRef } from 'react';

interface HeightSyncProps {
  /** Selector CSS (#id, .clase) o Ref del panel derecho */
  syncWith: string | React.RefObject<HTMLElement>;
  minHeight?: number;
  maxHeight?: number;
  /** breakpoint tailwind a partir del cual sincronizar */
  enableFrom?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  children: React.ReactNode;
}

const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

export default function HeightSync({
  syncWith,
  minHeight = 320,
  maxHeight = 960,
  enableFrom = 'lg',
  className = '',
  children,
}: HeightSyncProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [targetHeight, setTargetHeight] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  // Activar solo en >= breakpoint
  useEffect(() => {
    const update = () => setEnabled(window.innerWidth >= breakpoints[enableFrom]);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [enableFrom]);

  // Observar el target (derecha) y ajustar altura
  useEffect(() => {
    if (!enabled) {
      setTargetHeight(null);
      return;
    }

    let element: HTMLElement | null = null;
    if (typeof syncWith === 'string') {
      element = document.querySelector(syncWith) as HTMLElement | null; // ✅ usar querySelector
    } else {
      element = syncWith.current || null;
    }
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const h = entry.contentRect.height;
      const clamped = Math.max(minHeight, Math.min(h, maxHeight));
      setTargetHeight(clamped);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, syncWith, minHeight, maxHeight]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        height: enabled && targetHeight ? `${targetHeight}px` : 'auto',
        transition: 'height 0.2s ease-out',
      }}
    >
      {/* El hijo debe usar h-full para ocupar la altura sincronizada */}
      <div className="h-full">{children}</div>
    </div>
  );
}