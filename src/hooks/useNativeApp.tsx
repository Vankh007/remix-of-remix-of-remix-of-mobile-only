import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { initializeAdMob } from '@/services/admobService';

/**
 * Comprehensive hook for native Android/iOS app functionality
 * Handles: back button, status bar, safe areas, AdMob initialization
 */
export function useNativeApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveTheme } = useTheme();
  const isInitialized = useRef(false);

  // Initialize native features on mount
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isInitialized.current) return;
    isInitialized.current = true;

    const initNative = async () => {
      try {
        // Initialize AdMob
        await initializeAdMob();
        console.log('[NativeApp] AdMob initialized');

        // Configure status bar
        await configureStatusBar(effectiveTheme);
        console.log('[NativeApp] Status bar configured');
      } catch (error) {
        console.error('[NativeApp] Initialization error:', error);
      }
    };

    initNative();
  }, []);

  // Update status bar when theme changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    configureStatusBar(effectiveTheme);
  }, [effectiveTheme]);

  // Handle Android back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // Special handling for certain routes
      const isHome = location.pathname === '/';
      const isAuth = location.pathname === '/auth';
      const isShort = location.pathname === '/short';

      // On home or auth, minimize app instead of navigating back
      if (isHome || isAuth) {
        CapacitorApp.minimizeApp();
        return;
      }

      // On shorts page, go to home
      if (isShort) {
        navigate('/');
        return;
      }

      // Otherwise navigate back if possible
      if (canGoBack) {
        navigate(-1);
      } else {
        navigate('/');
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate, location.pathname]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App came to foreground - refresh status bar
        configureStatusBar(effectiveTheme);
      }
    });

    return () => {
      stateListener.then(listener => listener.remove());
    };
  }, [effectiveTheme]);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    isAndroid: Capacitor.getPlatform() === 'android',
    isIOS: Capacitor.getPlatform() === 'ios',
  };
}

/**
 * Configure status bar for native platforms
 */
async function configureStatusBar(theme: string) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Transparent overlay mode
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
    
    // Set icon style based on theme
    // Dark theme = white icons (Style.Dark means dark content = light icons)
    // Light theme = dark icons (Style.Light means light content = dark icons)
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
  } catch (error) {
    console.error('[NativeApp] Status bar config error:', error);
  }
}

/**
 * Static helper to check if running on native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Static helper to get current platform
 */
export function getNativePlatform(): 'android' | 'ios' | 'web' {
  const platform = Capacitor.getPlatform();
  return platform as 'android' | 'ios' | 'web';
}
