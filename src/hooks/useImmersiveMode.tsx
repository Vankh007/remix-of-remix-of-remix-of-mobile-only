import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Interface for the native ImmersiveMode plugin
 * Controls Android navigation bar and status bar visibility
 */
interface ImmersiveModePlugin {
  enterImmersive(): Promise<{ success: boolean }>;
  exitImmersive(): Promise<{ success: boolean }>;
}

// Only register plugin on Android
const ImmersiveMode = Capacitor.getPlatform() === 'android' 
  ? registerPlugin<ImmersiveModePlugin>('ImmersiveMode')
  : null;

/**
 * Small delay helper for native calls
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enter immersive fullscreen mode - hides status bar and navigation bar
 * Only works on Android native platform
 */
export async function enterImmersiveMode(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android' || !ImmersiveMode) {
    console.log('Immersive mode: Not on Android or plugin not available');
    return;
  }
  
  try {
    console.log('Entering immersive mode...');
    // Small delay to ensure the activity is ready
    await delay(50);
    const result = await ImmersiveMode.enterImmersive();
    console.log('Immersive mode entered:', result);
  } catch (error) {
    console.error('Failed to enter immersive mode:', error);
  }
}

/**
 * Exit immersive mode - shows status bar and navigation bar
 * Only works on Android native platform
 */
export async function exitImmersiveMode(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android' || !ImmersiveMode) {
    console.log('Immersive mode: Not on Android or plugin not available');
    return;
  }
  
  try {
    console.log('Exiting immersive mode...');
    // Small delay to ensure the activity is ready
    await delay(50);
    const result = await ImmersiveMode.exitImmersive();
    console.log('Immersive mode exited:', result);
  } catch (error) {
    console.error('Failed to exit immersive mode:', error);
  }
}
