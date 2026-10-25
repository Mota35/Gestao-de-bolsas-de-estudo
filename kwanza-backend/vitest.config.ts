import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    fileParallelism: false, // todos os ficheiros partilham a mesma BD de teste
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
