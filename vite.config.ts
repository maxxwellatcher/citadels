import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    proxy: {
      '/online': {
        target: 'http://127.0.0.1:5174',
        ws: true,
      },
    },
  },
});
