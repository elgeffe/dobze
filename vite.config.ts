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
          // Match on the corpus directories rather than a list of languages:
          // the previous pattern named pl|en|nl only, so the five added later
          // fell through into the entry chunk. The app precaches the whole
          // build for offline use, so this is about cache granularity and
          // parse cost rather than bytes on the wire — editing one language's
          // data should not rewrite the hash of the application code.
          const corpus = /\/src\/data\/(frequency|content)\/([a-z]{2})\.json$/.exec(id);
          if (corpus) return `${corpus[1]}-${corpus[2]}`;
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
