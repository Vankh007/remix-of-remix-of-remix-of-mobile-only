import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// AdMob plugin type definitions (aligned with @capacitor-community/admob)
interface AdMobPlugin {
  initialize: (options: {
    testingDevices?: string[];
    initializeForTesting?: boolean;
    tagForChildDirectedTreatment?: boolean;
    tagForUnderAgeOfConsent?: boolean;
    maxAdContentRating?: 'General' | 'ParentalGuidance' | 'Teen' | 'MatureAudience';
    requestTrackingAuthorization?: boolean;
  }) => Promise<void>;

  prepareRewardVideoAd: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showRewardVideoAd: () => Promise<{ type: string; amount?: number }>;

  // Banner ad methods
  showBanner: (options: {
    adId: string;
    adSize?: string;
    position?: 'TOP_CENTER' | 'BOTTOM_CENTER';
    margin?: number;
    isTesting?: boolean;
  }) => Promise<void>;
  hideBanner: () => Promise<void>;
  resumeBanner: () => Promise<void>;
  removeBanner: () => Promise<void>;

  // Interstitial ad methods
  prepareInterstitial: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showInterstitial: () => Promise<void>;
  addListener: (eventName: string, callback: (info: any) => void) => Promise<{ remove: () => void }>;
}

let admobPlugin: AdMobPlugin | null = null;
let isInitialized = false;
let initializationPromise: Promise<boolean> | null = null;
let bannerShowing = false;

/**
 * Get the AdMob plugin instance
 */
export function getAdMobPlugin(): AdMobPlugin | null {
  if (admobPlugin) return admobPlugin;
  
  try {
    // Try to get from Capacitor Plugins
    const plugins = (window as any).Capacitor?.Plugins;
    if (plugins?.AdMob) {
      admobPlugin = plugins.AdMob as AdMobPlugin;
      return admobPlugin;
    }
    
    // Try dynamic import for newer Capacitor versions
    return null;
  } catch (error) {
    console.error('[AdMob] Error getting plugin:', error);
    return null;
  }
}

/**
 * Initialize AdMob SDK
 * Must be called once at app startup
 */
export async function initializeAdMob(): Promise<boolean> {
  // Return cached promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Return true if already initialized
  if (isInitialized) {
    return true;
  }
  
  initializationPromise = (async () => {
    try {
      // Only initialize on native platforms
      if (!Capacitor.isNativePlatform()) {
        console.log('[AdMob] Not a native platform, skipping initialization');
        return false;
      }
      
      const plugin = getAdMobPlugin();
      if (!plugin) {
        console.error('[AdMob] Plugin not available');
        return false;
      }
      
      // Fetch App ID from settings (optional - Capacitor config is primary)
      let appId = '';
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'admob_rewarded_app_id')
          .single();
        
        if (data?.setting_value) {
          appId = typeof data.setting_value === 'string' 
            ? data.setting_value 
            : String(data.setting_value);
        }
      } catch (error) {
        console.log('[AdMob] Could not fetch App ID from settings, using Capacitor config');
      }
      
      // Initialize the AdMob SDK
      await plugin.initialize({
        requestTrackingAuthorization: true,
        testingDevices: [],
      });
      
      console.log('[AdMob] SDK initialized successfully', appId ? `with App ID: ${appId}` : '');
      isInitialized = true;
      return true;
    } catch (error) {
      console.error('[AdMob] Initialization failed:', error);
      return false;
    }
  })();
  
  return initializationPromise;
}

/**
 * Load a rewarded ad
 */
export async function loadRewardedAd(adUnitId: string, isTesting = false): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    
    // Ensure AdMob is initialized
    const initialized = await initializeAdMob();
    if (!initialized) {
      console.error('[AdMob] Cannot load ad - SDK not initialized');
      return false;
    }
    
    const plugin = getAdMobPlugin();
    if (!plugin) {
      console.error('[AdMob] Plugin not available');
      return false;
    }
    
    console.log('[AdMob] Loading rewarded ad:', adUnitId);
    await plugin.prepareRewardVideoAd({
      adId: adUnitId,
      isTesting,
    });
    
    console.log('[AdMob] Rewarded ad loaded successfully');
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to load rewarded ad:', error);
    return false;
  }
}

/**
 * Show a rewarded ad
 */
export async function showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean; amount?: number }> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return { shown: false, rewarded: false };
    }
    
    const plugin = getAdMobPlugin();
    if (!plugin) {
      console.error('[AdMob] Plugin not available');
      return { shown: false, rewarded: false };
    }
    
    console.log('[AdMob] Showing rewarded ad');
    const result = await plugin.showRewardVideoAd();
    
    console.log('[AdMob] Rewarded ad result:', result);
    return {
      shown: true,
      rewarded: result.type === 'RewardReceived',
      amount: result.amount,
    };
  } catch (error) {
    console.error('[AdMob] Failed to show rewarded ad:', error);
    return { shown: false, rewarded: false };
  }
}

/**
 * Check if AdMob is initialized
 */
export function isAdMobInitialized(): boolean {
  return isInitialized;
}

/**
 * Check if AdMob is available on this platform
 */
export function isAdMobAvailable(): boolean {
  return Capacitor.isNativePlatform() && getAdMobPlugin() !== null;
}

/**
 * Show a banner ad
 */
export async function showBannerAd(
  adUnitId: string,
  isTesting = false,
  position: 'top' | 'bottom' = 'top'
): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const initialized = await initializeAdMob();
    if (!initialized) {
      console.error('[AdMob] Cannot show banner - SDK not initialized');
      return false;
    }

    const plugin = getAdMobPlugin();
    if (!plugin) {
      console.error('[AdMob] Plugin not available');
      return false;
    }

    // @capacitor-community/admob expects TOP_CENTER / BOTTOM_CENTER
    const pluginPosition: 'TOP_CENTER' | 'BOTTOM_CENTER' =
      position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER';

    console.log('[AdMob] Showing banner ad:', adUnitId, 'position:', pluginPosition);
    await plugin.showBanner({
      adId: adUnitId,
      isTesting,
      position: pluginPosition,
      adSize: 'ADAPTIVE_BANNER',
      margin: 0,
    });

    bannerShowing = true;
    console.log('[AdMob] Banner ad shown successfully');
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to show banner ad:', error);
    return false;
  }
}

/**
 * Hide the current banner ad
 */
export async function hideBannerAd(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform() || !bannerShowing) {
      return false;
    }

    const plugin = getAdMobPlugin();
    if (!plugin) {
      return false;
    }

    await plugin.hideBanner();
    bannerShowing = false;
    console.log('[AdMob] Banner ad hidden');
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to hide banner ad:', error);
    return false;
  }
}

/**
 * Remove the banner ad completely
 */
export async function removeBannerAd(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const plugin = getAdMobPlugin();
    if (!plugin) {
      return false;
    }

    await plugin.removeBanner();
    bannerShowing = false;
    console.log('[AdMob] Banner ad removed');
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to remove banner ad:', error);
    return false;
  }
}

/**
 * Check if banner is currently showing
 */
export function isBannerShowing(): boolean {
  return bannerShowing;
}

/**
 * Load an interstitial ad
 */
export async function loadInterstitialAd(adUnitId: string, isTesting = false): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const initialized = await initializeAdMob();
    if (!initialized) {
      console.error('[AdMob] Cannot load interstitial - SDK not initialized');
      return false;
    }

    const plugin = getAdMobPlugin();
    if (!plugin) {
      console.error('[AdMob] Plugin not available');
      return false;
    }

    console.log('[AdMob] Loading interstitial ad:', adUnitId);
    await plugin.prepareInterstitial({
      adId: adUnitId,
      isTesting,
    });

    console.log('[AdMob] Interstitial ad loaded successfully');
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to load interstitial ad:', error);
    return false;
  }
}

/**
 * Show an interstitial ad
 */
export async function showInterstitialAd(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const plugin = getAdMobPlugin();
    if (!plugin) {
      console.error('[AdMob] Plugin not available');
      return false;
    }

    console.log('[AdMob] Showing interstitial ad');
    await plugin.showInterstitial();
    console.log('[AdMob] Interstitial ad shown');
    return true;
  } catch (error) {
    console.error('[AdMob] Failed to show interstitial ad:', error);
    return false;
  }
}
