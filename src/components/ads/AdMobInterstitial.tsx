import { useCallback } from 'react';
import { useAdMob } from '@/hooks/useAdMob';
import { loadInterstitialAd, showInterstitialAd } from '@/services/admobService';

/**
 * Hook to control AdMob interstitial ads
 * Fetches configuration from Supabase and respects frequency caps
 */
export function useAdMobInterstitial() {
  const { 
    isNative, 
    isEnabled, 
    getAdForPlacement, 
    canShowInterstitial,
    recordInterstitialShown,
    globalSettings,
    interstitialSettings 
  } = useAdMob();

  /**
   * Load and show an interstitial ad for a specific placement
   * Returns true if the ad was shown successfully
   */
  const showInterstitial = useCallback(async (placement: string): Promise<boolean> => {
    if (!isNative || !isEnabled) {
      console.log('[AdMobInterstitial] Not native or not enabled');
      return false;
    }

    if (!canShowInterstitial()) {
      console.log('[AdMobInterstitial] Frequency cap reached or cooldown active');
      return false;
    }

    const ad = getAdForPlacement(placement, 'interstitial');
    if (!ad) {
      console.log(`[AdMobInterstitial] No active interstitial ad found for placement: ${placement}`);
      return false;
    }

    try {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      console.log(`[AdMobInterstitial] Loading interstitial for ${placement}:`, ad.ad_unit_id);
      
      const loaded = await loadInterstitialAd(ad.ad_unit_id, useTestMode);
      if (!loaded) {
        console.log('[AdMobInterstitial] Failed to load interstitial');
        return false;
      }

      const shown = await showInterstitialAd();
      if (shown) {
        recordInterstitialShown();
        console.log('[AdMobInterstitial] Interstitial shown successfully');
      }
      return shown;
    } catch (error) {
      console.error('[AdMobInterstitial] Error showing interstitial:', error);
      return false;
    }
  }, [isNative, isEnabled, canShowInterstitial, getAdForPlacement, globalSettings, recordInterstitialShown]);

  /**
   * Check if interstitial should be shown on app start
   */
  const shouldShowOnAppStart = useCallback(() => {
    return isEnabled && interstitialSettings?.show_on_app_start;
  }, [isEnabled, interstitialSettings]);

  /**
   * Check if interstitial should be shown between episodes
   */
  const shouldShowBetweenEpisodes = useCallback(() => {
    return isEnabled && interstitialSettings?.show_between_episodes && canShowInterstitial();
  }, [isEnabled, interstitialSettings, canShowInterstitial]);

  return {
    showInterstitial,
    shouldShowOnAppStart,
    shouldShowBetweenEpisodes,
    canShow: canShowInterstitial,
    isEnabled: isNative && isEnabled,
  };
}

export default useAdMobInterstitial;
