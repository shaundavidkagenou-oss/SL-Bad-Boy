import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
  build: {
    // Three.js is the only substantial runtime dependency (~143 kB total gzip).
    chunkSizeWarningLimit: 650,
  },
});
