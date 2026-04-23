import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aicallassistant.app',
  appName: 'AI Call Assistant',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#3b82f6',
      sound: 'notification.wav',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#3b82f6',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#3b82f6',
    },
    BackgroundRunner: {
      label: 'com.aicallassistant.background.check',
      src: 'runners/updateChecker.js',
      event: 'checkForUpdates',
      repeat: true,
      interval: 15,
      autoStart: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'AI Call Assistant',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
