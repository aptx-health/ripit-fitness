import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./lib/test/setup.ts'],
    testTimeout: 60000, // Longer timeout for container startup
    hookTimeout: 60000, // Longer timeout for setup hooks
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
})