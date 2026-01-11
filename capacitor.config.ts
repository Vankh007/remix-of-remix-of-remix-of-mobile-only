import type { CapacitorConfig } from '@capacitor/cli';

const DEV_SERVER_URL = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.plexkhmerzoon',
  appName: 'Khmerzoon-Tv',
  webDir: 'dist',
  ...(DEV_SERVER_URL
    ? {
        server: {
          url: DEV_SERVER_URL,
          cleartext: true,
        },
      }
    : {}),
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
  },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '956107790298-nvsmcmq5r8hb2j0ghbh5opji2olpk3ps.apps.googleusercontent.com',
      },
    },
    AdMob: {
      appId: 'ca-app-pub-5699578431552008~3848955446',
      requestTrackingAuthorization: true,
    },
  },
};

export default config;


