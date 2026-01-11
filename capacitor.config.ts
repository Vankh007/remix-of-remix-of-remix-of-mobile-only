import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plexkhmerzoon',
  appName: 'KHMERZOON',
  webDir: 'dist',
  android: {
    backgroundColor: '#00000000',
    allowMixedContent: true,
    appendUserAgent: 'KHMERZOON-Native',
  },
  ios: {
    backgroundColor: '#00000000',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    App: {
      launchShowDuration: 0
    },
    SocialLogin: {
      google: {
        webClientId: '956107790298-nvsmcmq5r8hb2j0ghbh5opji2olpk3ps.apps.googleusercontent.com'
      }
    }
  }
};

export default config;

