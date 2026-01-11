import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { hideStatusBar, showStatusBar } from './useNativeStatusBar';
import { enterImmersiveMode, exitImmersiveMode } from './useImmersiveMode';

/**
 * Global fullscreen state management
 * Detects fullscreen from native video, CSS-based fullscreen, and iframe embeds
 */

let globalIsFullscreen = false;
const listeners = new Set<(isFullscreen: boolean) => void>();

export function getGlobalFullscreenState(): boolean {
  return globalIsFullscreen;
}

export function setGlobalFullscreenState(value: boolean): void {
  globalIsFullscreen = value;
  listeners.forEach(listener => listener(value));
}

/**
 * Hook to subscribe to global fullscreen state changes
 */
export function useFullscreenState() {
  const [isFullscreen, setIsFullscreen] = useState(globalIsFullscreen);

  useEffect(() => {
    const listener = (value: boolean) => setIsFullscreen(value);
    listeners.add(listener);
    
    // Sync on mount
    setIsFullscreen(globalIsFullscreen);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return isFullscreen;
}

/**
 * Hook to detect and handle iframe/embed fullscreen on Android native
 * This handles the case when users click the fullscreen button inside an embedded player
 */
export function useIframeFullscreenHandler() {
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (!isAndroidNative) return;

    let wasInFullscreen = false;

    const handleFullscreenChange = async () => {
      const isFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      // Update global state
      setGlobalFullscreenState(isFS);

      if (isFS && !wasInFullscreen) {
        // Entering fullscreen - rotate to landscape and enter immersive mode
        wasInFullscreen = true;
        try {
          await enterImmersiveMode();
          await new Promise(resolve => setTimeout(resolve, 50));
          await ScreenOrientation.lock({ orientation: 'landscape' });
          await hideStatusBar();
        } catch (e) {
          console.error('[IframeFullscreen] Error entering fullscreen mode:', e);
        }
      } else if (!isFS && wasInFullscreen) {
        // Exiting fullscreen - rotate back to portrait
        wasInFullscreen = false;
        try {
          await ScreenOrientation.lock({ orientation: 'portrait' });
          await new Promise(resolve => setTimeout(resolve, 50));
          await exitImmersiveMode();
          await showStatusBar();
        } catch (e) {
          console.error('[IframeFullscreen] Error exiting fullscreen mode:', e);
        }
      }
    };

    // Listen for fullscreen changes (triggered by iframe embed fullscreen buttons)
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isAndroidNative]);
}
