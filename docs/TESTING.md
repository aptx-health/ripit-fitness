# Testing

Vitest with Testcontainers. Each run starts its own Postgres and Redis, so Docker must be running. Doppler is not needed. Run the suite with `npm run test:run`, or one file with `npm run test:run -- <pattern>`. `npm test` starts watch mode.

On Dustin's Mac, Docker runs under Colima. Export these before running tests, or Testcontainers reports "no working container runtime strategy":

```bash
export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=true
```

vitest-cucumber runs each step as its own test. A scenario counts as passing only when all of its steps pass. While a scenario is red, a negative `Then` step can pass on its own.

## Approach

- Integration tests sit at the API layer, not UI components.
- Tests call the lib function, or a simulation of the route logic, directly with a `PrismaClient`, with no HTTP.
- Assert database state, not just return values.
- Cover critical paths, edge cases, authorization and validation. Avoid excessive permutations.
- Behaviour specs live in `features/**/*.feature`. Step definitions go in `__tests__/features/**` and run through `@amiceli/vitest-cucumber`.

## Shape

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createMultiWeekProgram } from '@/lib/test/factories'

describe('Feature', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    userId = (await createTestUser()).id
  })

  it('does the thing', async () => {
    const { workouts } = await createMultiWeekProgram(prisma, userId, { weekCount: 2 })
    const result = await simulateApiCall(prisma, workouts[0].id, userId, {})
    expect(result.success).toBe(true)
  })
})
```

## Factories (`lib/test/factories.ts`)

- `createTestUser`
- `createTestProgram`
- `createMultiWeekProgram`
- `createTestExerciseDefinition`
- `createTestWorkoutCompletion`
- `createTestPrescribedSets`
- `createTestLoggedSets`

The clone worker tests (`__tests__/api/clone-worker.test.ts`) also start Redis 7 and drive BullMQ through Queue, Worker and QueueEvents.
