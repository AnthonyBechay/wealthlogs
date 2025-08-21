import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wealthlog.app',
  appName: 'WealthLog',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'default',
      backgroundColor: '#3b82f6'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    Preferences: {
      group: 'WealthLogGroup'
    }
  }
};

export default config;
