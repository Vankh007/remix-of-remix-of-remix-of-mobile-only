import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Hook to manage native status bar appearance based on theme
 * - Sets transparent overlay mode so content goes behind status bar
 * - Sets appropriate text/icon style (light/dark) for visibility
 */
export function useNativeStatusBar() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        // Make status bar overlay the webview (transparent)
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        // Set status bar style based on theme
        // Dark theme = light icons (white), Light theme = dark icons (black)
        await StatusBar.setStyle({
          style: theme === 'dark' ? Style.Dark : Style.Light
        });

        // Set transparent background
        await StatusBar.setBackgroundColor({
          color: '#00000000'
        });
      } catch (error) {
        console.error('Failed to update status bar:', error);
      }
    };

    updateStatusBar();
  }, [theme]);
}

/**
 * Hide status bar completely (for fullscreen video playback)
 */
export async function hideStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Failed to hide status bar:', error);
  }
}

/**
 * Show status bar (when exiting fullscreen)
 */
export async function showStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await StatusBar.show();
    // Restore overlay mode
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
  } catch (error) {
    console.error('Failed to show status bar:', error);
  }
}

/**
 * Set status bar to overlay mode (transparent over content)
 */
export async function setStatusBarOverlay(overlay: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await StatusBar.setOverlaysWebView({ overlay });
    if (overlay) {
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    }
  } catch (error) {
    console.error('Failed to set status bar overlay:', error);
  }
}
