
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // This ensures assets are loaded relatively, fixing the "blank page" on GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
