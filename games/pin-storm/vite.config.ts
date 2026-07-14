import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  base: '/minimalgames/pin-storm/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    port: 3005,
  },
});
