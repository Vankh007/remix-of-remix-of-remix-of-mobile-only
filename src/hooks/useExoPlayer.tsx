import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Interface for the native ExoPlayer plugin
 * Used to play videos in fullscreen landscape mode on Android
 */
interface ExoPlayerPlugin {
  play(options: {
    url: string;
    title?: string;
    subtitle?: string;
    startPosition?: number;
  }): Promise<{
    position: number;
    duration: number;
    completed: boolean;
  }>;
  
  // Method to check if plugin is actually implemented
  isImplemented?(): Promise<{ implemented: boolean }>;
}

// Track if we've verified the plugin works
let exoPlayerVerified = false;
let exoPlayerWorks = false;

// Only register plugin on Android native
const ExoPlayer = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
  ? registerPlugin<ExoPlayerPlugin>('ExoPlayer')
  : null;

/**
 * Check if ExoPlayer is available (Android native only)
 * Returns false if the native plugin is not actually implemented
 */
export function isExoPlayerAvailable(): boolean {
  // If we've already verified, return cached result
  if (exoPlayerVerified) {
    return exoPlayerWorks;
  }
  
  // ExoPlayer native plugin is NOT implemented in this project
  // Always return false to use the web-based Shaka player instead
  // This prevents the "ExoPlayer plugin is not implemented on android" error
  return false;
}

/**
 * Async check for ExoPlayer availability - tries to verify if plugin actually works
 */
export async function checkExoPlayerAvailable(): Promise<boolean> {
  if (exoPlayerVerified) {
    return exoPlayerWorks;
  }
  
  if (!ExoPlayer || Capacitor.getPlatform() !== 'android' || !Capacitor.isNativePlatform()) {
    exoPlayerVerified = true;
    exoPlayerWorks = false;
    return false;
  }
  
  // The native plugin is not implemented in this project
  // Return false to use web-based player
  exoPlayerVerified = true;
  exoPlayerWorks = false;
  return false;
}

/**
 * Play video using native ExoPlayer in fullscreen landscape mode
 * @param url - Video URL (HLS, DASH, or MP4)
 * @param title - Video title to display
 * @param subtitle - Optional subtitle (e.g., episode info)
 * @param startPosition - Start position in milliseconds
 * @returns Promise with playback result (position, duration, completed)
 */
export async function playWithExoPlayer(
  url: string,
  title?: string,
  subtitle?: string,
  startPosition?: number
): Promise<{ position: number; duration: number; completed: boolean } | null> {
  if (!isExoPlayerAvailable() || !ExoPlayer) {
    console.log('ExoPlayer not available - using web player instead');
    return null;
  }

  try {
    console.log('Playing with ExoPlayer:', { url, title, startPosition });
    const result = await ExoPlayer.play({
      url,
      title: title || '',
      subtitle: subtitle || '',
      startPosition: startPosition || 0
    });
    console.log('ExoPlayer playback result:', result);
    return result;
  } catch (error) {
    console.error('ExoPlayer error:', error);
    // Mark as not working so we don't try again
    exoPlayerVerified = true;
    exoPlayerWorks = false;
    throw error;
  }
}

/**
 * Hook to use ExoPlayer
 */
export function useExoPlayer() {
  return {
    isAvailable: isExoPlayerAvailable(),
    play: playWithExoPlayer,
    checkAvailable: checkExoPlayerAvailable
  };
}
