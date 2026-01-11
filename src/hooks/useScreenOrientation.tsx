import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

/**
 * Detect if we're running in a PWA (standalone mode) on iOS
 */
const isIOSPWA = (): boolean => {
  const isStandalone = (window.navigator as any).standalone === true;
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS && (isStandalone || isDisplayModeStandalone);
};

/**
 * Detect if we're on a mobile phone (not iPad/tablet)
 */
const isMobilePhone = (): boolean => {
  const isMobileUA = /iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIPad = /iPad/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isNarrowScreen = window.innerWidth < 768;
  return isMobileUA && !isIPad && isNarrowScreen;
};

/**
 * Try to lock screen orientation using the Web API (works on some browsers)
 */
const tryLockOrientation = async () => {
  // Only apply to mobile phones
  if (!isMobilePhone()) return;
  
  const orientation = screen.orientation as any;
  if (orientation && orientation.lock) {
    try {
      await orientation.lock('portrait');
      console.log('Screen orientation locked to portrait');
    } catch (e) {
      // Orientation lock not supported in PWA - this is expected on iOS
      console.log('Orientation lock not supported in this browser');
    }
  }
};

/**
 * Hook to manage screen orientation for native apps and PWA
 * - Native: Uses Capacitor ScreenOrientation API
 * - PWA Mobile: Uses CSS-based portrait lock
 * - PWA iPad: No lock (handled by video fullscreen separately)
 */
export function useScreenOrientation(allowLandscape: boolean = false) {
  const isInitializedRef = useRef(false);
  const allowLandscapeRef = useRef(allowLandscape);
  const orientationChangeInProgressRef = useRef(false);
  
  // Update ref when prop changes
  allowLandscapeRef.current = allowLandscape;
  
  // Try to lock orientation using Web API on mount
  useEffect(() => {
    if (!allowLandscape) {
      tryLockOrientation();
    }
  }, [allowLandscape]);
  
  useEffect(() => {
    // For iOS PWA on iPad, skip - video fullscreen uses CSS transforms
    // For iOS PWA on mobile, we use CSS lock above
    if (isIOSPWA()) {
      return;
    }
    
    if (!Capacitor.isNativePlatform()) return;
    
    // Only initialize once per mount
    if (isInitializedRef.current) {
      const updateOrientation = async () => {
        if (orientationChangeInProgressRef.current) return;
        orientationChangeInProgressRef.current = true;
        try {
          if (allowLandscapeRef.current) {
            await ScreenOrientation.unlock();
          } else {
            await ScreenOrientation.lock({ orientation: 'portrait' });
          }
        } catch (error) {
          console.error('Failed to update screen orientation:', error);
        } finally {
          orientationChangeInProgressRef.current = false;
        }
      };
      updateOrientation();
      return;
    }
    
    isInitializedRef.current = true;

    const lockOrientation = async () => {
      orientationChangeInProgressRef.current = true;
      try {
        if (allowLandscapeRef.current) {
          await ScreenOrientation.unlock();
        } else {
          await ScreenOrientation.lock({ orientation: 'portrait' });
        }
      } catch (error) {
        console.error('Failed to set screen orientation:', error);
      } finally {
        orientationChangeInProgressRef.current = false;
      }
    };

    lockOrientation();

    const handleOrientationChange = (info: { type: string }) => {
      window.dispatchEvent(new CustomEvent('native-orientation-change', { 
        detail: { orientation: info.type }
      }));
    };

    ScreenOrientation.addListener('screenOrientationChange', handleOrientationChange);

    return () => {
      if (Capacitor.isNativePlatform() && allowLandscapeRef.current) {
        ScreenOrientation.lock({ orientation: 'portrait' }).catch(console.error);
      }
      ScreenOrientation.removeAllListeners().catch(console.error);
      isInitializedRef.current = false;
    };
  }, []);
  
  // Handle prop changes
  useEffect(() => {
    if (isIOSPWA()) return;
    if (!Capacitor.isNativePlatform() || !isInitializedRef.current) return;
    if (orientationChangeInProgressRef.current) return;
    
    const updateOrientation = async () => {
      orientationChangeInProgressRef.current = true;
      try {
        if (allowLandscape) {
          await ScreenOrientation.unlock();
        } else {
          await ScreenOrientation.lock({ orientation: 'portrait' });
        }
      } catch (error) {
        console.error('Failed to update screen orientation:', error);
      } finally {
        orientationChangeInProgressRef.current = false;
      }
    };
    
    updateOrientation();
  }, [allowLandscape]);
}
