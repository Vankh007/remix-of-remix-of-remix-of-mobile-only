import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plexkhmerzoon',
  appName: 'PlexKhmerZoon',
  webDir: 'dist',
  server: {
    url: 'https://5a59b6e4-40f6-4249-9156-cd090c989a64.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '956107790298-nvsmcmq5r8hb2j0ghbh5opji2olpk3ps.apps.googleusercontent.com'
      }
    }
  }
};

export default config;

