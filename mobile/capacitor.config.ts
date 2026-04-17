import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viecz.mobile',
  appName: 'Viecz',
  webDir: 'www',
  server: {
    url: 'https://viecz.fishcmus.io.vn/marketplace',
    cleartext: false,
  },
};

export default config;
