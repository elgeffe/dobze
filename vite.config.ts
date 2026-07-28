import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/js/generated/')) return 'frequency-data';
          const content = /\/js\/content\/(pl|en|nl)\.js$/.exec(id);
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
    include: ['src/**/*.test.ts'],
  },
});
