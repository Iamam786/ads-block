import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

interface PinchZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const DOUBLE_TAP_DELAY = 300;

export function usePinchZoom(containerRef: RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState<PinchZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const pointers = useRef<Map<number, PointerEvent>>(new Map());
  const initialDistance = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);

  // Calculate distance between two pointers
  const getDistance = useCallback((touches: PointerEvent[]): number => {
    if (touches.length < 2) return 0;
    const [p1, p2] = touches;
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point between two pointers
  const getCenter = useCallback(
    (touches: PointerEvent[]): { x: number; y: number } => {
      if (touches.length < 2) {
        return {
          x: touches[0]?.clientX || 0,
          y: touches[0]?.clientY || 0,
        };
      }
      const [p1, p2] = touches;
      return {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
      };
    },
    []
  );

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      pointers.current.set(e.pointerId, e);

      if (pointers.current.size === 1) {
        // Single tap - check for double tap
        const now = Date.now();
        if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
          // Double tap detected - reset zoom
          setZoom({ scale: 1, translateX: 0, translateY: 0 });
        }
        lastTapTime.current = now;
      }

      if (pointers.current.size === 2) {
        // Pinch started
        const touches = Array.from(pointers.current.values());
        initialDistance.current = getDistance(touches as PointerEvent[]);
      }
    },
    [getDistance]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      pointers.current.set(e.pointerId, e);

      if (pointers.current.size === 2 && initialDistance.current !== null) {
        const touches = Array.from(pointers.current.values());
        const currentDistance = getDistance(touches as PointerEvent[]);
        const center = getCenter(touches as PointerEvent[]);
        const container = containerRef.current;

        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const deltaDistance = currentDistance - initialDistance.current;
        const scaleFactor = 1 + deltaDistance / 100;
        const newScale = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, zoom.scale * scaleFactor)
        );

        const scaleChange = newScale - zoom.scale;

        setZoom((prev) => ({
          scale: newScale,
          translateX: prev.translateX - center.x * scaleChange,
          translateY: prev.translateY - center.y * scaleChange,
        }));

        initialDistance.current = currentDistance;
      }
    },
    [getDistance, getCenter, zoom.scale, containerRef]
  );

  // Handle pointer up
  const handlePointerUp = useCallback((e: PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size === 0) {
      initialDistance.current = null;
    }
  }, []);

  // Apply smooth animation
  const applyTransform = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const transform = `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})`;
    container.style.transform = transform;
    container.style.transition = 'transform 0.1s ease-out';
  }, [zoom, containerRef]);

  useEffect(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(applyTransform);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [applyTransform]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return zoom;
}