import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { iosSplashPlugin } from './scripts/vite-plugin-ios-splash';
import { offlinePlugin } from './scripts/vite-plugin-offline';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    iosSplashPlugin({ publicDir: here('./public') }),
    offlinePlugin({
      template: here('./src/sw/service-worker.js'),
      publicDir: here('./public'),
    }),
  ],
  build: {
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/frequency/')) return 'frequency-data';
          const content = /\/src\/data\/content\/(pl|en|nl)\.json$/.exec(id);
          if (content) return `content-${content[1]}`;
          if (id.includes('/node_modules/')) return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
