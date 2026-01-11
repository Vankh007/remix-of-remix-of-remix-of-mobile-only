// AdMob Components for Native Apps
// These components fetch ad configuration from Supabase (app_ads table)
// and display native AdMob ads controlled from the admin dashboard

export { AdMobBanner, useAdMobBannerControl } from './AdMobBanner';
export { useAdMobInterstitial } from './AdMobInterstitial';
export { AdMobRewardedButton, useAdMobRewarded } from './AdMobRewarded';

// Re-export hook for convenience
export { useAdMob } from '@/hooks/useAdMob';

// Re-export service functions for direct control
export {
  initializeAdMob,
  showBannerAd,
  hideBannerAd,
  removeBannerAd,
  loadInterstitialAd,
  showInterstitialAd,
  loadRewardedAd,
  showRewardedAd,
  isAdMobAvailable,
  isAdMobInitialized,
} from '@/services/admobService';
