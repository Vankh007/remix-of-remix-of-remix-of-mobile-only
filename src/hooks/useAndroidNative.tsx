import { useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to detect if running on Android native app (built with Capacitor/Android Studio)
 * Returns true only when running as a native Android app, not in browser or PWA
 */
export function useAndroidNative() {
  const isAndroidNative = useMemo(() => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }, []);

  return isAndroidNative;
}

/**
 * Static helper function for non-hook contexts
 */
export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
