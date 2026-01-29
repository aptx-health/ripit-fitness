import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./lib/test/global-setup.ts'],
    setupFiles: ['./lib/test/setup.ts'],
    testTimeout: 60000, // Longer timeout for container startup
    hookTimeout: 60000, // Longer timeout for setup hooks
    env: {
      // Pass environment variables from Doppler/shell to tests
      // Only set if defined - empty string breaks emulator detection
      ...(process.env.PUBSUB_EMULATOR_HOST && {
        PUBSUB_EMULATOR_HOST: process.env.PUBSUB_EMULATOR_HOST
      }),
      ...(process.env.PUBSUB_PROJECT_ID && {
        PUBSUB_PROJECT_ID: process.env.PUBSUB_PROJECT_ID
      }),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
})