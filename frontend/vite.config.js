import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The studio app is served by Vite and proxies /api to the FastAPI service on
// 8000, so the session cookie stays first-party in development and production.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
