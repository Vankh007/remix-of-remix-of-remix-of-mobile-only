import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAdMob } from '@/hooks/useAdMob';
import { showBannerAd, hideBannerAd, removeBannerAd } from '@/services/admobService';

interface AdMobBannerProps {
  placement: string;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * AdMob Banner Ad Component
 * Fetches ad configuration from Supabase and displays native AdMob banner
 * Only renders on native platforms (Android/iOS)
 */
export function AdMobBanner({ placement, position = 'bottom', className = '' }: AdMobBannerProps) {
  const { isNative, isEnabled, getAdForPlacement, globalSettings } = useAdMob();
  const bannerShownRef = useRef(false);

  useEffect(() => {
    if (!isNative || !isEnabled) return;

    const ad = getAdForPlacement(placement, 'banner');
    if (!ad) {
      console.log(`[AdMobBanner] No active banner ad found for placement: ${placement}`);
      return;
    }

    const showAd = async () => {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      console.log(`[AdMobBanner] Showing banner for ${placement}:`, ad.ad_unit_id, 'test:', useTestMode);
      
      const success = await showBannerAd(ad.ad_unit_id, useTestMode, position);
      if (success) {
        bannerShownRef.current = true;
      }
    };

    showAd();

    // Cleanup: hide banner when component unmounts
    return () => {
      if (bannerShownRef.current) {
        hideBannerAd();
        bannerShownRef.current = false;
      }
    };
  }, [isNative, isEnabled, placement, position, getAdForPlacement, globalSettings]);

  // This component doesn't render any visible content
  // The banner is rendered natively by the AdMob SDK
  if (!isNative) return null;

  return (
    <div 
      className={`admob-banner-placeholder ${className}`} 
      data-placement={placement}
      data-position={position}
    />
  );
}

/**
 * Hook to manually control AdMob banner visibility
 */
export function useAdMobBannerControl() {
  const { isNative, isEnabled, getAdForPlacement, globalSettings } = useAdMob();

  const show = async (placement: string, position: 'top' | 'bottom' = 'bottom') => {
    if (!isNative || !isEnabled) return false;

    const ad = getAdForPlacement(placement, 'banner');
    if (!ad) return false;

    const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
    return showBannerAd(ad.ad_unit_id, useTestMode, position);
  };

  const hide = async () => {
    return hideBannerAd();
  };

  const remove = async () => {
    return removeBannerAd();
  };

  return { show, hide, remove, isEnabled: isNative && isEnabled };
}

export default AdMobBanner;
