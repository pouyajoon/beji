import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
});

