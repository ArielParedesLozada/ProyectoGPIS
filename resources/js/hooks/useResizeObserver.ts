import { useEffect, useRef, useState } from 'react';

interface ResizeObserverSize {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement = HTMLElement>(): [
  React.RefObject<T | null>,
  ResizeObserverSize
] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ResizeObserverSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number;

    const resizeObserver = new ResizeObserver((entries) => {
      // Throttle with requestAnimationFrame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setSize({ width, height });
        }
      });
    });

    resizeObserver.observe(element);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return [ref, size];
}
