import type { CapacitorConfig } from '@capacitor/cli';

const DEV_SERVER_URL = process.env.CAPACITOR_SERVER_URL;
// IMPORTANT:
// Only use a remote dev server URL when explicitly enabled.
// This prevents shipping an Android build that loads https://khmerzoon.biz (or any remote URL)
// instead of the bundled `dist/` folder.
const USE_DEV_SERVER = process.env.CAPACITOR_USE_DEV_SERVER === 'true';

const config: CapacitorConfig = {
  appId: 'com.plexkhmerzoon',
  appName: 'Khmerzoon-Tv',
  webDir: 'dist',
  ...(USE_DEV_SERVER && DEV_SERVER_URL
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
        webClientId: '944708960468-an9no0hgjk5km71ccrednumqknliqhkq.apps.googleusercontent.com',
      },
    },
    AdMob: {
      appId: 'ca-app-pub-4789683198372521~7914037351',
      requestTrackingAuthorization: true,
      initializeForTesting: false,
    },
  },
};

export default config;


