import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'zustand',
      'axios',
      'socket.io-client',
      '@tanstack/react-query'
    ],
    exclude: ['react-icons'], // Exclude to enable tree shaking
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          animations: ['framer-motion'],
          networking: ['axios', 'socket.io-client', '@tanstack/react-query'],
          state: ['zustand']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
