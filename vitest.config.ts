import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/'],
    },
    // Increased timeout for comprehensive accessibility tests across all themes and screen sizes
    testTimeout: 30000,
    // Prevent race conditions when tests access dist/index.html
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      // Handle ES module imports for browser environment
      '@': '/src',
    },
  },
});