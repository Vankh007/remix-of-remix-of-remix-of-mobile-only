import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const { pullDistance, isRefreshing, isEnabled } = usePullToRefresh({ onRefresh });

  if (!isEnabled) {
    return <>{children}</>;
  }

  const rotation = Math.min((pullDistance / 100) * 360, 360);
  const opacity = Math.min(pullDistance / 100, 1);

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      <div
        className="fixed top-14 left-0 right-0 flex justify-center z-50 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: isRefreshing ? 1 : opacity,
          transform: `translateY(${isRefreshing ? 0 : Math.min(pullDistance - 20, 40)}px)`,
        }}
      >
        <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
          <Loader2
            className="w-5 h-5 text-primary"
            style={{
              transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
            }}
            {...(isRefreshing && { className: 'w-5 h-5 text-primary animate-spin' })}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? 'none' : `translateY(${Math.min(pullDistance * 0.3, 30)}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
