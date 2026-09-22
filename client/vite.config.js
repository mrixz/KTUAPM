import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // Suppress the advisory for the main SPA bundle — it is intentionally large
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // React Router (large routing library)
          'vendor-router': ['react-router-dom'],
          // HTTP client
          'vendor-axios': ['axios'],
          // Icon library (many icons — benefits from its own cache chunk)
          'vendor-lucide': ['lucide-react']
        }
      }
    }
  }
});

