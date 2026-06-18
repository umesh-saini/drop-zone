import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dropzone/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@dropzone/crypto': path.resolve(__dirname, '../../packages/crypto/src'),
      '@dropzone/protocol': path.resolve(__dirname, '../../packages/protocol/src'),
    },
  },
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
