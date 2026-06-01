import { describe, expect, it } from 'vitest'
import { exerciseDefinitionSelectForLogger } from '@/lib/db/selects'

/**
 * Contract tests for the canonical `ExerciseDefinition` select shapes.
 *
 * These exist to catch the bug class that produced PR #854: a route was
 * silently returning exercises without `imageUrls`, and the logger UI
 * rendered "MORE IMAGES TO COME" forever. The fix was a missing
 * `imageUrls: true` in the route's Prisma `select`.
 *
 * Each assertion below names a field that the workout-logger UI (LOG SETS
 * / INFO / HISTORY) consumes. If you remove one of these from the
 * canonical shape, every route that imports it loses the field too — and
 * this test fails before merge, prompting you to confirm the change is
 * intentional and update consumers.
 *
 * See `docs/PRISMA_SELECT_PATTERN.md` for the wider convention.
 */
describe('exerciseDefinitionSelectForLogger', () => {
  const REQUIRED_FIELDS = [
    'id',
    'name',
    'primaryFAUs',
    'secondaryFAUs',
    'equipment',
    'instructions',
    'imageUrls',
  ] as const

  for (const field of REQUIRED_FIELDS) {
    it(`includes "${field}"`, () => {
      expect(exerciseDefinitionSelectForLogger).toHaveProperty(field, true)
    })
  }
})
