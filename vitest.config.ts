import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['lib/**/*'],
    globals: true,
    testTimeout: 10000,
  },
})