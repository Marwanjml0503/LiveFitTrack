import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marwan.firebaseapp',
  appName: 'FitnessTracker',
  webDir: 'dist/firebaseapp/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
