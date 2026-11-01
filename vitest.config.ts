import path from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

// Node 22.4+ has a global `localStorage` getter that shadows jsdom's (Node 26
// enables it by default), which leaves `window.localStorage` undefined in
// tests. Turn Node's off for the test workers. Older Node rejects the flag.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number)
const hasWebStorageFlag = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 4)

export default defineConfig({
  test: {
    globals: true,
    // Gherkin step files (vitest-cucumber) live next to the features they bind
    include: [...configDefaults.include, '__tests__/features/**/*.steps.ts'],
    environment: 'jsdom',
    globalSetup: [path.resolve(__dirname, './lib/test/global-setup.ts')],
    setupFiles: [path.resolve(__dirname, './lib/test/setup.ts')],
    ...(hasWebStorageFlag && { poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } } }),
    testTimeout: 60000, // Longer timeout for container startup
    hookTimeout: 60000, // Longer timeout for setup hooks
    // Exclude nested worktrees from test discovery
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/fitcsv-wt2/**',
      '**/fitcsv-wt3/**',
      '**/.claude/worktrees/**',
      '**/.git/**',
    ],
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