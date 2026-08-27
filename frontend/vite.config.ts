import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split the vendors that genuinely load at boot into long-cached
        // chunks. recharts and socket.io are deliberately NOT listed: naming
        // them here promoted their chunks into index.html's modulepreload
        // list, so the login screen downloaded 120 KB of charting/websocket
        // code it never uses. Left unnamed, Vite keeps them inside the lazy
        // page chunks that actually import them.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
});
