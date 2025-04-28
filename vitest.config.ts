import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['{src,tests}/**/*.{test,spec}.?(c|m)[jt]s?(x)'], // Include both src and tests
    environment: 'jsdom',
    globals: true, // Enable global test APIs
  },
  resolve: { // Add resolve alias for Vitest
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
