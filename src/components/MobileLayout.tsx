import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from './MobileHeader';
import MobileSidebar from './MobileSidebar';
import BottomNav from './BottomNav';
import { PullToRefresh } from './PullToRefresh';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleRefresh = async () => {
    window.location.reload();
  };

  useEffect(() => {
    const isGuestMode = localStorage.getItem('guestMode') === 'true';
    if (!loading && !user && !isGuestMode) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isGuestMode = localStorage.getItem('guestMode') === 'true';
  if (!user && !isGuestMode) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-background dark:bg-black ${isNative ? 'native-safe-area-top' : 'pt-[env(safe-area-inset-top)]'}`}>
      <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
      <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="min-h-screen pb-16 px-[1px]">
          {children}
        </main>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default MobileLayout;
