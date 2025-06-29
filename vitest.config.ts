import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'unit/**/*.test.ts',
      'unit/**/*.spec.ts',
    ],
    globals: true,
    environment: 'node'
  },
});
