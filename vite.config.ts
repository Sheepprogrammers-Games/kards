import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@engine': resolvePath('./src/engine'),
      '@ui': resolvePath('./src/ui'),
      '@content': resolvePath('./src/content'),
      '@fx': resolvePath('./src/fx'),
      '@audio': resolvePath('./src/audio'),
    },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
