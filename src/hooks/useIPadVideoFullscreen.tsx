import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { hideStatusBar, showStatusBar } from './useNativeStatusBar';
import { enterImmersiveMode, exitImmersiveMode } from './useImmersiveMode';
import { setGlobalFullscreenState } from './useFullscreenState';

interface UseIPadVideoFullscreenOptions {
  containerRef: RefObject<HTMLDivElement>;
  videoRef: RefObject<HTMLVideoElement>;
}

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
 * Detect if we're on an iPad
 */
const isIPad = (): boolean => {
  return /iPad/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detect if we're on a mobile phone (not iPad/tablet)
 */
const isMobilePhone = (): boolean => {
  const isMobileUA = /iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isNotIPad = !isIPad();
  return isMobileUA && isNotIPad;
};

/**
 * Check if we're on Android native platform
 */
const isAndroidNative = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

/**
 * Hook to manage video fullscreen with proper handling for:
 * - Mobile phones: Native fullscreen + orientation lock to landscape
 * - iPad/iOS PWA: CSS-based fullscreen
 * - Desktop: Native fullscreen API
 */
export function useIPadVideoFullscreen({ containerRef, videoRef }: UseIPadVideoFullscreenOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const playbackStateRef = useRef({ time: 0, wasPlaying: false, playbackRate: 1 });
  const fullscreenStylesRef = useRef<HTMLStyleElement | null>(null);
  const isFullscreenRef = useRef(false);
  const playbackGuardIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state and update global fullscreen state
  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
    setGlobalFullscreenState(isFullscreen);
  }, [isFullscreen]);

  // Save current playback state without pausing video
  const savePlaybackState = useCallback(() => {
    if (videoRef.current) {
      playbackStateRef.current = {
        time: videoRef.current.currentTime,
        wasPlaying: !videoRef.current.paused,
        playbackRate: videoRef.current.playbackRate,
      };
    }
  }, [videoRef]);

  // Restore playback state after transition
  const restorePlaybackState = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const { time, wasPlaying, playbackRate } = playbackStateRef.current;
    video.playbackRate = playbackRate;

    if (time > 0 && Math.abs(video.currentTime - time) > 0.5) {
      video.currentTime = time;
    }

    if (wasPlaying && video.paused) {
      try {
        await video.play();
      } catch (e) {
        console.warn('Could not resume playback:', e);
      }
    }
  }, [videoRef]);

  // Ensure video keeps playing during transitions
  const ensurePlayback = useCallback(() => {
    const video = videoRef.current;
    if (video && playbackStateRef.current.wasPlaying && video.paused) {
      video.play().catch(e => console.log('Resume play during transition:', e));
    }
  }, [videoRef]);

  // Maintain playback during device rotation
  const maintainPlaybackDuringRotation = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    savePlaybackState();
    
    // Set up interval to continuously ensure playback during rotation
    if (playbackGuardIntervalRef.current) {
      clearInterval(playbackGuardIntervalRef.current);
    }
    playbackGuardIntervalRef.current = setInterval(ensurePlayback, 50);
    
    // Clear after transition
    setTimeout(() => {
      if (playbackGuardIntervalRef.current) {
        clearInterval(playbackGuardIntervalRef.current);
        playbackGuardIntervalRef.current = null;
      }
      ensurePlayback();
    }, 500);
  }, [videoRef, savePlaybackState, ensurePlayback]);

  // Apply CSS-based fullscreen for PWA mode (iPad only)
  const applyPWAFullscreenStyles = useCallback((entering: boolean) => {
    const container = containerRef.current;
    if (!container) return;

    if (entering) {
      const style = document.createElement('style');
      style.id = 'ipad-video-fullscreen-styles';
      
      style.textContent = `
        /* Fullscreen container - fills entire viewport including status bar area */
        .ipad-video-fullscreen-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          z-index: 99999 !important;
          background: black !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          /* Override safe area - video fills entire screen in fullscreen */
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .ipad-video-fullscreen-container video {
          width: 100% !important;
          height: 100% !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          max-height: 100dvh !important;
          object-fit: contain !important;
        }

        /* Body styles when fullscreen is active */
        body.ipad-video-fullscreen-active {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          touch-action: none !important;
          /* Hide status bar area by making content fill entire viewport */
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
        
        /* HTML element also needs to ignore safe areas in fullscreen */
        html:has(body.ipad-video-fullscreen-active) {
          padding: 0 !important;
          margin: 0 !important;
        }

        .ipad-video-fullscreen-container .video-controls {
          z-index: 100000 !important;
        }
        
        /* Hide bottom navigation and other UI elements in fullscreen */
        body.ipad-video-fullscreen-active nav,
        body.ipad-video-fullscreen-active [data-bottom-nav],
        body.ipad-video-fullscreen-active .bottom-nav,
        body.ipad-video-fullscreen-active footer,
        body.ipad-video-fullscreen-active header {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      fullscreenStylesRef.current = style;

      document.body.classList.add('ipad-video-fullscreen-active');
      container.classList.add('ipad-video-fullscreen-container');
    } else {
      // Remove fullscreen styles
      if (fullscreenStylesRef.current) {
        fullscreenStylesRef.current.remove();
        fullscreenStylesRef.current = null;
      }

      document.body.classList.remove('ipad-video-fullscreen-active');
      container.classList.remove('ipad-video-fullscreen-container');
    }
  }, [containerRef]);

  // Toggle fullscreen with proper handling for different platforms
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || isTransitioning) return;

    setIsTransitioning(true);
    savePlaybackState();

    const isPWA = isIOSPWA();
    const isPadDevice = isIPad();
    const isNative = Capacitor.isNativePlatform();
    const isMobile = isMobilePhone();
    const orientation = screen.orientation as any;

    // Create a function to ensure video keeps playing during transitions
    const ensurePlaybackDuringTransition = () => {
      if (video && playbackStateRef.current.wasPlaying && video.paused) {
        video.play().catch(e => console.log('Resume play during transition:', e));
      }
    };

    // Set up interval to continuously check and resume playback during rotation
    const playbackGuardInterval = setInterval(ensurePlaybackDuringTransition, 50);
    
    const cleanupGuard = () => {
      setTimeout(() => {
        clearInterval(playbackGuardInterval);
        ensurePlaybackDuringTransition();
      }, 500);
    };

    try {
      if (!isFullscreen) {
        // ENTERING FULLSCREEN
        await hideStatusBar();
        
        // For PWA on iPad, try to make status bar less visible by changing theme color
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', '#000000');
        }

        // Android native: Use CSS-based fullscreen + orientation lock + immersive mode
        // This avoids conflicts between native fullscreen API and orientation changes
        if (isAndroidNative()) {
          try {
            // First enter immersive mode to hide all system bars
            await enterImmersiveMode();
            // Small delay to let immersive mode settle
            await new Promise(resolve => setTimeout(resolve, 100));
            // Then lock to landscape
            await ScreenOrientation.lock({ orientation: 'landscape' });
            // Apply CSS fullscreen for consistent UI
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
            await restorePlaybackState();
            cleanupGuard();
          } catch (e) {
            console.error('Android fullscreen error:', e);
            // Fallback to just CSS fullscreen
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
          }
        } else if (isNative) {
          // iOS native app: use Capacitor screen orientation + native fullscreen
          try {
            await ScreenOrientation.lock({ orientation: 'landscape' });
          } catch (e) {
            console.warn('Could not lock orientation:', e);
          }
          // Try native fullscreen on iOS
          try {
            if (container.requestFullscreen) {
              await container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
              await (container as any).webkitRequestFullscreen();
            }
            setIsFullscreen(true);
            cleanupGuard();
          } catch (e) {
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
          }
        } else if (isMobile && !isPWA) {
          // For mobile web browsers: try native fullscreen + orientation lock
          try {
            if (container.requestFullscreen) {
              await container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
              await (container as any).webkitRequestFullscreen();
            }
            
            // Lock to landscape on mobile when entering fullscreen
            if (orientation && orientation.lock) {
              try {
                await orientation.lock('landscape');
              } catch (e) {
                console.log('Orientation lock not supported');
              }
            }
            
            setIsFullscreen(true);
            cleanupGuard();
          } catch (e) {
            console.error('Fullscreen error:', e);
            // Fallback to CSS-based fullscreen
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
          }
        } else if (isPWA || isPadDevice) {
          // iPad PWA: CSS-based fullscreen (no rotation)
          applyPWAFullscreenStyles(true);
          setIsFullscreen(true);
          await restorePlaybackState();
          cleanupGuard();
        } else {
          // Desktop browser: native fullscreen
          try {
            if (container.requestFullscreen) {
              await container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
              await (container as any).webkitRequestFullscreen();
            }
            cleanupGuard();
          } catch (e) {
            console.error('Fullscreen error:', e);
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
          }
        }
      } else {
        // EXITING FULLSCREEN
        await showStatusBar();
        
        // Restore theme color when exiting fullscreen
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          // Check if dark mode
          const isDarkMode = document.documentElement.classList.contains('dark') || 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
          themeColorMeta.setAttribute('content', isDarkMode ? '#0f1419' : '#ffffff');
        }

        // Android native: Exit immersive mode first, then lock to portrait
        if (isAndroidNative()) {
          try {
            // First lock back to portrait
            await ScreenOrientation.lock({ orientation: 'portrait' });
            // Small delay before exiting immersive
            await new Promise(resolve => setTimeout(resolve, 100));
            // Exit immersive mode
            await exitImmersiveMode();
            // Remove CSS fullscreen
            applyPWAFullscreenStyles(false);
            setIsFullscreen(false);
            await restorePlaybackState();
            cleanupGuard();
          } catch (e) {
            console.error('Android exit fullscreen error:', e);
            applyPWAFullscreenStyles(false);
            setIsFullscreen(false);
          }
        } else if (isNative) {
          // iOS native
          try {
            await ScreenOrientation.lock({ orientation: 'portrait' });
          } catch (e) {
            console.warn('Could not unlock orientation:', e);
          }
          // Check if we're using CSS-based fullscreen
          if (container.classList.contains('ipad-video-fullscreen-container')) {
            applyPWAFullscreenStyles(false);
            setIsFullscreen(false);
            await restorePlaybackState();
            cleanupGuard();
          } else {
            // Exit native fullscreen
            try {
              if (document.exitFullscreen) {
                await document.exitFullscreen();
              } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen();
              }
              cleanupGuard();
            } catch (e) {
              console.error('Exit fullscreen error:', e);
            }
          }
        } else if (container.classList.contains('ipad-video-fullscreen-container')) {
          // CSS-based fullscreen (PWA/iPad)
          applyPWAFullscreenStyles(false);
          setIsFullscreen(false);
          await restorePlaybackState();
          cleanupGuard();
        } else {
          // Exit native fullscreen (web browser)
          try {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            }
            
            // Unlock orientation when exiting fullscreen
            if (orientation && orientation.unlock) {
              try {
                orientation.unlock();
              } catch (e) {
                console.log('Orientation unlock not supported');
              }
            }
            cleanupGuard();
          } catch (e) {
            console.error('Exit fullscreen error:', e);
          }
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
      applyPWAFullscreenStyles(false);
      setIsFullscreen(false);
      clearInterval(playbackGuardInterval);
    } finally {
      setIsTransitioning(false);
    }
  }, [isFullscreen, isTransitioning, containerRef, videoRef, savePlaybackState, restorePlaybackState, applyPWAFullscreenStyles]);

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      // Only update state for native fullscreen changes
      if (!containerRef.current?.classList.contains('ipad-video-fullscreen-container')) {
        setIsFullscreen(isNativeFS);
        
        // Hide/show status bar based on fullscreen state
        if (isNativeFS) {
          hideStatusBar();
        } else {
          showStatusBar();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [containerRef]);

  // Handle orientation changes - maintain playback during rotation
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleOrientationChange = () => {
      const wasPlaying = !video.paused;
      
      if (wasPlaying) {
        const ensurePlayback = () => {
          if (video.paused) {
            video.play().catch(e => console.log('Resume play after orientation change:', e));
          }
        };
        
        // Check multiple times during the transition
        requestAnimationFrame(ensurePlayback);
        setTimeout(ensurePlayback, 100);
        setTimeout(ensurePlayback, 300);
        setTimeout(ensurePlayback, 500);
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      screen.orientation?.removeEventListener('change', handleOrientationChange);
    };
  }, [videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fullscreenStylesRef.current) {
        fullscreenStylesRef.current.remove();
      }
      document.body.classList.remove('ipad-video-fullscreen-active');
      
      if (playbackGuardIntervalRef.current) {
        clearInterval(playbackGuardIntervalRef.current);
      }
    };
  }, []);

  return {
    isFullscreen,
    isTransitioning,
    toggleFullscreen,
    savePlaybackState,
    restorePlaybackState,
    maintainPlaybackDuringRotation
  };
}
