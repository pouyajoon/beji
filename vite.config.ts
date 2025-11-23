import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/proto': path.resolve(__dirname, './src/proto'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    // Exclude API and authentication routes from Vite's SPA handling
    // These should be handled by Fastify
    fs: {
      strict: false,
    },
  },
});

