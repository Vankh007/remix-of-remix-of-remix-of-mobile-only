import { useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeApp } from '@/hooks/useNativeApp';

interface NativeAppProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes and manages native app features
 * Place this inside BrowserRouter but wraps the main app content
 */
export function NativeAppProvider({ children }: NativeAppProviderProps) {
  const { isNative, isAndroid } = useNativeApp();

  // Add native-specific CSS class to body for styling hooks
  useEffect(() => {
    if (isNative) {
      document.body.classList.add('native-app');
      document.body.classList.add(`native-${Capacitor.getPlatform()}`);
    }

    return () => {
      document.body.classList.remove('native-app');
      document.body.classList.remove('native-android', 'native-ios');
    };
  }, [isNative]);

  // Disable context menu on native (prevents long-press showing browser menu)
  useEffect(() => {
    if (!isNative) return;

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, [isNative]);

  // Disable overscroll bounce on Android
  useEffect(() => {
    if (!isAndroid) return;

    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, [isAndroid]);

  return <>{children}</>;
}
