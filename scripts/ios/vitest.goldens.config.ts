/**
 * Runs the iOS golden generators (scripts/ios/*.goldens.ts) with the repo's test setup (Postgres
 * test database, jsdom), without adding them to `npm run test:run`.
 *   npx vitest run --config scripts/ios/vitest.goldens.config.ts
 * Times and dates are rendered in America/Denver, as the phone tests' Clock.
 */

import base from '../../vitest.config'

process.env.TZ = 'America/Denver'

// Spread rather than mergeConfig, which would add to the base `include` instead of replacing it.
export default { ...base, test: { ...base.test, include: ['scripts/ios/*.goldens.ts'] } }
