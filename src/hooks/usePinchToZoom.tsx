import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePinchToZoomProps {
  containerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  isFullscreen: boolean;
  enabled?: boolean;
}

interface TouchState {
  initialDistance: number;
  initialScale: number;
  initialX: number;
  initialY: number;
  currentX: number;
  currentY: number;
}

export const usePinchToZoom = ({
  containerRef,
  videoRef,
  isFullscreen,
  enabled = true
}: UsePinchToZoomProps) => {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const touchStateRef = useRef<TouchState | null>(null);
  const isPinchingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastTapRef = useRef(0);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  // Check if device is mobile or tablet
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    if (videoRef.current) {
      videoRef.current.style.transform = 'none';
    }
  }, [videoRef]);

  // Apply transform to video element
  const applyTransform = useCallback((newScale: number, newTranslateX: number, newTranslateY: number) => {
    if (!videoRef.current) return;
    
    // Clamp scale
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    
    // Calculate max pan based on scale
    const video = videoRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const scaledWidth = containerRect.width * clampedScale;
    const scaledHeight = containerRect.height * clampedScale;
    const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    // Clamp translation
    const clampedTranslateX = Math.min(Math.max(newTranslateX, -maxTranslateX), maxTranslateX);
    const clampedTranslateY = Math.min(Math.max(newTranslateY, -maxTranslateY), maxTranslateY);

    setScale(clampedScale);
    setTranslateX(clampedTranslateX);
    setTranslateY(clampedTranslateY);

    video.style.transform = `translate(${clampedTranslateX}px, ${clampedTranslateY}px) scale(${clampedScale})`;
    video.style.transformOrigin = 'center center';
  }, [containerRef, videoRef]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !isFullscreen || !isTouchDevice()) return;

    // Double tap to reset zoom
    const now = Date.now();
    if (e.touches.length === 1 && scale > 1) {
      if (now - lastTapRef.current < 300) {
        e.preventDefault();
        resetZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    }

    if (e.touches.length === 2) {
      // Start pinch gesture
      e.preventDefault();
      isPinchingRef.current = true;
      const center = getCenter(e.touches[0], e.touches[1]);
      touchStateRef.current = {
        initialDistance: getDistance(e.touches[0], e.touches[1]),
        initialScale: scale,
        initialX: center.x,
        initialY: center.y,
        currentX: translateX,
        currentY: translateY
      };
    } else if (e.touches.length === 1 && scale > 1) {
      // Start pan gesture when zoomed in
      isPanningRef.current = true;
      touchStateRef.current = {
        initialDistance: 0,
        initialScale: scale,
        initialX: e.touches[0].clientX,
        initialY: e.touches[0].clientY,
        currentX: translateX,
        currentY: translateY
      };
    }
  }, [enabled, isFullscreen, isTouchDevice, scale, translateX, translateY, getDistance, getCenter, resetZoom]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isFullscreen || !touchStateRef.current) return;

    if (e.touches.length === 2 && isPinchingRef.current) {
      e.preventDefault();
      const state = touchStateRef.current;
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      
      // Calculate new scale
      const scaleRatio = currentDistance / state.initialDistance;
      const newScale = state.initialScale * scaleRatio;
      
      // Calculate pan during pinch
      const panX = center.x - state.initialX;
      const panY = center.y - state.initialY;
      
      applyTransform(newScale, state.currentX + panX, state.currentY + panY);
    } else if (e.touches.length === 1 && isPanningRef.current && scale > 1) {
      e.preventDefault();
      const state = touchStateRef.current;
      const panX = e.touches[0].clientX - state.initialX;
      const panY = e.touches[0].clientY - state.initialY;
      
      applyTransform(scale, state.currentX + panX, state.currentY + panY);
    }
  }, [enabled, isFullscreen, scale, getDistance, getCenter, applyTransform]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) {
      isPinchingRef.current = false;
      isPanningRef.current = false;
      touchStateRef.current = null;
      
      // Snap back to 1x if close to it
      if (scale < 1.1) {
        resetZoom();
      }
    } else if (e.touches.length === 1 && isPinchingRef.current) {
      // Switch from pinch to pan
      isPinchingRef.current = false;
      if (scale > 1) {
        isPanningRef.current = true;
        touchStateRef.current = {
          initialDistance: 0,
          initialScale: scale,
          initialX: e.touches[0].clientX,
          initialY: e.touches[0].clientY,
          currentX: translateX,
          currentY: translateY
        };
      }
    }
  }, [scale, translateX, translateY, resetZoom]);

  // Reset zoom when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen && scale !== 1) {
      resetZoom();
    }
  }, [isFullscreen, scale, resetZoom]);

  // Attach/detach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !isFullscreen) return;

    const options: AddEventListenerOptions = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, enabled, isFullscreen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    scale,
    translateX,
    translateY,
    resetZoom,
    isZoomed: scale > 1
  };
};
