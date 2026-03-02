# Pub/Sub Emulator — Test Infrastructure

How to run Pub/Sub integration tests locally and in CI. The emulator runs as a Docker container managed by Testcontainers — no manual startup, no Java dependency.

**Completed**: 2026-01-28

## How It Works

```
Vitest test file
  └── beforeAll → startPubSubEmulator()
        └── Testcontainers pulls messagebird/gcloud-pubsub-emulator:latest
        └── Exposes random port, sets process.env.PUBSUB_EMULATOR_HOST
  └── test runs against emulator
  └── afterAll → stopPubSubEmulator()
        └── Container stopped, env var cleaned up
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/test/pubsub-emulator.ts` | Start/stop emulator container via Testcontainers |
| `__tests__/pubsub-emulator.test.ts` | Hello world integration test (reference impl) |
| `lib/test/setup.ts` | Global test setup (DB bootstrap, non-fatal if skipped) |

## Writing a New Pub/Sub Test

Copy the pattern from `__tests__/pubsub-emulator.test.ts`:

```typescript
/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PubSub } from '@google-cloud/pubsub';
import { OAuth2Client } from 'google-auth-library';
import { startPubSubEmulator, stopPubSubEmulator } from '@/lib/test/pubsub-emulator';

describe('My Pub/Sub Feature', () => {
  beforeAll(async () => {
    await startPubSubEmulator();
  }, 30000);

  afterAll(async () => {
    await stopPubSubEmulator();
  }, 10000);

  it('should do something', async () => {
    // Suppress MetadataLookupWarning — emulator doesn't need auth
    // but the client attempts ADC lookup without this.
    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: 'emulator-test' });

    const pubsub = new PubSub({
      projectId: 'test-project',
      authClient,
    });

    // ... your test logic
  });
});
```

## Running Tests

```bash
# Run just the emulator test
doppler run --config dev_test -- npx vitest run __tests__/pubsub-emulator.test.ts

# Run all tests (emulator + DB tests)
doppler run --config dev_test -- npm run test:run
```

No manual emulator startup needed — Testcontainers handles everything.

## CI

The GitHub Actions workflow (`.github/workflows/test.yml`) needs no special config — Testcontainers pulls and manages the emulator container the same way it does PostgreSQL. `TESTCONTAINERS_RYUK_DISABLED=true` is set to avoid flaky cleanup in CI.

## Gotchas We Hit (and Why)

### 1. `@vitest-environment node` is required

The global vitest config uses `environment: 'jsdom'` for React component tests. `@google-cloud/pubsub` needs real Node.js APIs (grpc, net, etc.). Without this directive you get "Could not load the default credentials" even though the emulator is running.

### 2. Use `authClient`, not `credentials`, for dummy auth

- `credentials` expects a service account JSON shape (`JWTInput`) — you'd need a valid private key
- `authClient` accepts an `OAuth2Client` instance directly
- The emulator ignores auth entirely, but the client logs `MetadataLookupWarning` if it can't resolve ADC

### 3. Image must be `messagebird/gcloud-pubsub-emulator:latest`

- `gcr.io/cloud-sdk/gcloud-emulators:pubsub` requires GCP Artifact Registry auth — fails in CI
- The messagebird image is a public Docker Hub mirror, no auth needed
- Port is 8681 (not the default 8085 from the gcloud CLI emulator)

### 4. `@testcontainers/gcloud` PubSubEmulatorContainer doesn't auto-default the image

Version 11.x passes `image` through to `GenericContainer` without a default — results in `Cannot read properties of undefined (reading 'split')`. We use `GenericContainer` directly instead.

### 5. DB setup is non-fatal in `setup.ts`

The global `setupFiles` runs for every test file, including emulator-only tests. `getTestDatabase()` is wrapped in try/catch so it warns but doesn't block tests that don't need the DB.

## Resources

- [messagebird/gcloud-pubsub-emulator](https://github.com/marcelcorso/gcloud-pubsub-emulator) — Docker image we use
- [Pub/Sub Emulator Docs](https://cloud.google.com/pubsub/docs/emulator)
- [Testcontainers Node.js](https://node.testcontainers.org/)
