import type { Prisma } from '@prisma/client'

/**
 * Canonical Prisma `select` shapes for entities that are read by more than
 * one route. See `docs/PRISMA_SELECT_PATTERN.md` for the convention and
 * the reasoning behind it.
 *
 * Rule of thumb: if a select is used by more than one route, it belongs
 * here. One-off selects (admin debug endpoints, migration scripts) stay
 * inline. When a route needs the canonical shape *plus* extra fields,
 * spread the constant: `{ ...exerciseDefinitionSelectForLogger, extra: true }`.
 */

/**
 * Fields needed by the in-workout exercise info tab (LOG SETS / INFO /
 * HISTORY). Used by every route that returns an exercise back to the
 * logger UI — both the initial workout fetch and the mutation responses
 * (add, swap, replace).
 *
 * Missing a field here is what caused the "MORE IMAGES TO COME" bug — see
 * PR #854 for the post-mortem.
 */
export const exerciseDefinitionSelectForLogger = {
  id: true,
  name: true,
  primaryFAUs: true,
  secondaryFAUs: true,
  equipment: true,
  instructions: true,
  imageUrls: true,
} satisfies Prisma.ExerciseDefinitionSelect

export type ExerciseDefinitionForLogger = Prisma.ExerciseDefinitionGetPayload<{
  select: typeof exerciseDefinitionSelectForLogger
}>
