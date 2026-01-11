import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { initializeAdMob, showBannerAd, hideBannerAd, removeBannerAd } from '@/services/admobService';
import { useFullscreenState } from '@/hooks/useFullscreenState';

interface NativeBannerAdSlotProps {
  placement: string;
  className?: string;
}

interface BannerAdConfig {
  ad_unit_id: string;
  is_test_mode: boolean;
  platform: string;
  is_active: boolean;
}

export function NativeBannerAdSlot({ placement, className = '' }: NativeBannerAdSlotProps) {
  const [adConfig, setAdConfig] = useState<BannerAdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adShown, setAdShown] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const isFullscreen = useFullscreenState();

  // Fetch banner ad configuration from database
  useEffect(() => {
    const fetchAdConfig = async () => {
      // Only run on native platforms
      if (!Capacitor.isNativePlatform()) {
        setIsLoading(false);
        return;
      }

      try {
        // Check global settings first
        const { data: settingsData } = await supabase
          .from('app_ad_settings')
          .select('setting_value')
          .eq('setting_key', 'global_settings')
          .single();

        if (settingsData?.setting_value) {
          const globalSettings = settingsData.setting_value as { enabled?: boolean };
          if (globalSettings.enabled === false) {
            setGlobalEnabled(false);
            setIsLoading(false);
            return;
          }
        }

        // Determine platform
        const platform = Capacitor.getPlatform(); // 'android' or 'ios'
        
        // Fetch active banner ad for this placement
        // Placement from admin is like "Watch Screen Bottom Banner (Under Player)"
        // We need to match it flexibly - look for ads that match the placement pattern
        const { data, error } = await supabase
          .from('app_ads')
          .select('*')
          .eq('ad_type', 'banner')
          .eq('is_active', true)
          .or(`platform.eq.${platform},platform.eq.both`)
          .order('priority', { ascending: false })
          .limit(10);

        if (error && error.code !== 'PGRST116') {
          console.error('[NativeBannerAdSlot] Error fetching ad config:', error);
          setIsLoading(false);
          return;
        }

        // Find matching ad based on placement pattern
        // Match "watch_screen_bottom_banner" with "Watch Screen Bottom Banner (Under Player)"
        const matchingAd = data?.find(ad => {
          const normalizedDbPlacement = ad.placement.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedComponentPlacement = placement.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedDbPlacement.includes(normalizedComponentPlacement) || 
                 normalizedComponentPlacement.includes(normalizedDbPlacement.replace('underplayer', '').replace('aboveplayer', ''));
        });

        if (matchingAd) {
          setAdConfig({
            ad_unit_id: matchingAd.ad_unit_id,
            is_test_mode: matchingAd.is_test_mode,
            platform: matchingAd.platform,
            is_active: matchingAd.is_active,
          });
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('[NativeBannerAdSlot] Error:', err);
        setIsLoading(false);
      }
    };

    fetchAdConfig();
  }, [placement]);

  // Show banner when config is ready
  const displayBanner = useCallback(async () => {
    if (!adConfig || adShown || !globalEnabled || isFullscreen) return;

    try {
      // Initialize AdMob first
      const initialized = await initializeAdMob();
      if (!initialized) {
        console.log('[NativeBannerAdSlot] AdMob not initialized');
        return;
      }

      // Determine banner position based on placement
      // Top placements show at top, bottom/under placements show at bottom
      const position: 'top' | 'bottom' = placement.includes('top') ? 'top' : 'bottom';

      console.log('[NativeBannerAdSlot] Displaying banner:', adConfig.ad_unit_id, 'position:', position);
      const success = await showBannerAd(adConfig.ad_unit_id, adConfig.is_test_mode, position);
      
      if (success) {
        setAdShown(true);
        console.log('[NativeBannerAdSlot] Banner displayed successfully');
      }
    } catch (err) {
      console.error('[NativeBannerAdSlot] Error displaying banner:', err);
    }
  }, [adConfig, adShown, globalEnabled, isFullscreen, placement]);

  // Show banner when config is available
  useEffect(() => {
    if (adConfig && !adShown && globalEnabled) {
      displayBanner();
    }
  }, [adConfig, adShown, globalEnabled, displayBanner]);

  // Hide banner when entering fullscreen, show when exiting
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !adShown) return;
    
    if (isFullscreen) {
      hideBannerAd().catch(console.error);
    } else if (adConfig && globalEnabled) {
      // Re-show banner after exiting fullscreen
      displayBanner();
    }
  }, [isFullscreen, adShown, adConfig, globalEnabled, displayBanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (adShown && Capacitor.isNativePlatform()) {
        hideBannerAd().catch(console.error);
      }
    };
  }, [adShown]);

  // Don't render anything on non-native platforms
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  // Don't render if disabled or in fullscreen
  if (!globalEnabled || isFullscreen) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full h-[50px] bg-muted/20 animate-pulse ${className}`} />
    );
  }

  // No ad configured for this placement
  if (!adConfig) {
    return null;
  }

  // Placeholder for the banner ad
  // The actual banner is rendered by the native AdMob SDK above/below the webview
  return (
    <div 
      className={`w-full min-h-[50px] bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center p-0 m-0 ${className}`}
      data-ad-placement={placement}
      data-ad-unit={adConfig.ad_unit_id}
      style={{ padding: 0, margin: 0 }}
    >
      {!adShown && (
        <span className="text-xs text-muted-foreground animate-pulse">Loading Advertisement...</span>
      )}
      {adShown && (
        <span className="text-[10px] text-muted-foreground/60">Advertisement</span>
      )}
    </div>
  );
}
