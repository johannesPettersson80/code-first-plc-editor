import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{src,tests}/**/*.{test,spec}.?(c|m)[jt]s?(x)'], // Include both src and tests
    environment: 'jsdom',
    globals: true, // Enable global test APIs
  },
});