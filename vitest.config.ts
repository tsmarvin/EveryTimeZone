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
    // Use threads with minimal configuration to prevent RPC timeout issues
    pool: 'threads',
    poolOptions: {
      threads: {
        // Use single thread to prevent race conditions when tests access dist/index.html
        singleThread: true,
      },
    },
    // Increase overall test timeout and worker communication timeout
    hookTimeout: 60000,
    teardownTimeout: 60000,
  },
  resolve: {
    alias: {
      // Handle ES module imports for browser environment
      '@': '/src',
    },
  },
});