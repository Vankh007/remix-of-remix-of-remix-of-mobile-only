import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useNativeStatusBar } from '@/hooks/useNativeStatusBar';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

export const ThemeStatusBar = () => {
  const { theme } = useTheme();
  
  // Apply native status bar theming on mobile
  useNativeStatusBar();
  
  // Lock app to portrait mode by default (non-watch pages)
  useScreenOrientation(false);

  useEffect(() => {
    // Update theme-color meta tag dynamically based on current theme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (metaThemeColor) {
      const newColor = theme === 'dark' ? '#0f1419' : '#ffffff';
      metaThemeColor.setAttribute('content', newColor);
    }
  }, [theme]);

  return null;
};
