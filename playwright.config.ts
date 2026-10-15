import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    channel: process.env.PW_BROWSER_CHANNEL,
    launchOptions: {
      args: ['--force-webrtc-ip-handling-policy=default_public_and_private_interfaces'],
    },
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
});
