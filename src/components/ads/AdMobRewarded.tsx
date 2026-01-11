import { useCallback, useState } from 'react';
import { useAdMob } from '@/hooks/useAdMob';
import { loadRewardedAd, showRewardedAd } from '@/services/admobService';
import { Button } from '@/components/ui/button';
import { Play, Gift, Loader2 } from 'lucide-react';

interface AdMobRewardedButtonProps {
  placement: string;
  onRewardEarned?: (reward: { type: string; amount: number }) => void;
  onAdClosed?: () => void;
  onAdFailed?: (error: any) => void;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

/**
 * Rewarded Ad Button Component
 * Shows a button that plays a rewarded ad when clicked
 * Fetches ad configuration from Supabase
 */
export function AdMobRewardedButton({
  placement,
  onRewardEarned,
  onAdClosed,
  onAdFailed,
  children,
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
}: AdMobRewardedButtonProps) {
  const [loading, setLoading] = useState(false);
  const { isNative, isEnabled, getAdForPlacement, canShowRewarded, recordRewardedShown, getRewardAmount, globalSettings } = useAdMob();

  const handleClick = async () => {
    if (!isNative || !isEnabled || !canShowRewarded() || loading) return;

    const ad = getAdForPlacement(placement, 'rewarded');
    if (!ad) {
      console.log(`[AdMobRewarded] No active rewarded ad found for placement: ${placement}`);
      onAdFailed?.('No ad available');
      return;
    }

    setLoading(true);

    try {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      console.log(`[AdMobRewarded] Loading rewarded ad for ${placement}:`, ad.ad_unit_id);
      
      const loaded = await loadRewardedAd(ad.ad_unit_id, useTestMode);
      if (!loaded) {
        console.log('[AdMobRewarded] Failed to load rewarded ad');
        onAdFailed?.('Failed to load ad');
        setLoading(false);
        return;
      }

      const result = await showRewardedAd();
      
      if (result.rewarded) {
        recordRewardedShown();
        const reward = {
          type: ad.reward_type || 'coins',
          amount: getRewardAmount(ad.reward_amount || 1),
        };
        console.log('[AdMobRewarded] Reward earned:', reward);
        onRewardEarned?.(reward);
      }
      
      onAdClosed?.();
    } catch (error) {
      console.error('[AdMobRewarded] Error:', error);
      onAdFailed?.(error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render on web or if ads are disabled
  if (!isNative || !isEnabled) {
    return null;
  }

  const isDisabled = disabled || loading || !canShowRewarded();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading Ad...
        </>
      ) : (
        children || (
          <>
            <Gift className="h-4 w-4 mr-2" />
            Watch Ad for Reward
          </>
        )
      )}
    </Button>
  );
}

/**
 * Hook to manually control rewarded ads
 */
export function useAdMobRewarded() {
  const { isNative, isEnabled, getAdForPlacement, canShowRewarded, recordRewardedShown, getRewardAmount, globalSettings, rewardedSettings } = useAdMob();
  const [loading, setLoading] = useState(false);

  const showRewarded = useCallback(async (placement: string): Promise<{ success: boolean; reward?: { type: string; amount: number } }> => {
    if (!isNative || !isEnabled) {
      return { success: false };
    }

    if (!canShowRewarded()) {
      console.log('[AdMobRewarded] Daily limit reached');
      return { success: false };
    }

    const ad = getAdForPlacement(placement, 'rewarded');
    if (!ad) {
      console.log(`[AdMobRewarded] No active rewarded ad found for placement: ${placement}`);
      return { success: false };
    }

    setLoading(true);

    try {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      
      const loaded = await loadRewardedAd(ad.ad_unit_id, useTestMode);
      if (!loaded) {
        setLoading(false);
        return { success: false };
      }

      const result = await showRewardedAd();
      
      if (result.rewarded) {
        recordRewardedShown();
        const reward = {
          type: ad.reward_type || 'coins',
          amount: getRewardAmount(ad.reward_amount || 1),
        };
        setLoading(false);
        return { success: true, reward };
      }
      
      setLoading(false);
      return { success: false };
    } catch (error) {
      console.error('[AdMobRewarded] Error:', error);
      setLoading(false);
      return { success: false };
    }
  }, [isNative, isEnabled, canShowRewarded, getAdForPlacement, globalSettings, recordRewardedShown, getRewardAmount]);

  return {
    showRewarded,
    canShow: canShowRewarded,
    isEnabled: isNative && isEnabled,
    loading,
    maxPerDay: rewardedSettings?.max_per_day || 10,
  };
}

export default AdMobRewardedButton;
