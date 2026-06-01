# Prisma `select` pattern

## TL;DR

If a Prisma `select` shape is used by more than one route, **define it
once** in `lib/db/selects.ts` and import it. Adding a field updates every
consumer. One-off selects (admin debug endpoints, migration scripts) stay
inline.

This is a convention, not a hard constraint. Code review and the contract
tests in `__tests__/api/*-select-contract.test.ts` catch drift.

## Why

We hit a bug where the workout logger UI rendered "MORE IMAGES TO COME"
in the gym for exercises that had images at home. Root cause: four API
routes that hydrate an exercise on add/swap omitted `imageUrls: true`
from their hand-rolled `select` blocks. The page-level server component
selected it correctly, so a full reload masked the bug — only the
in-session optimistic update was wrong.

The deeper issue: every route that returns an `ExerciseDefinition` was
hand-rolling its own `select`. Drift between these hand-rolled blocks
was inevitable. The fix that ships fields back to the UI today fixes
nothing structural — the next field added to the schema will produce
the same bug class.

See PR #854 for the post-mortem.

## The pattern

### Declare canonical shapes

```typescript
// lib/db/selects.ts
import type { Prisma } from '@prisma/client'

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
```

Key choices:

- **`satisfies`, not `as`.** `as` asserts compatibility without checking;
  `satisfies` checks compatibility while preserving the literal type.
  TypeScript still knows the exact shape, so derived types are precise.
- **Named by consumer, not by content.** `forLogger` describes *who*
  uses the shape, not *what's in it*. Fields will change; the consumer
  relationship is stable.
- **Const, not function.** Module-level constants are evaluated once.
  Zero per-request cost — every route references the same object in
  memory.

### Use at call sites

```typescript
import { exerciseDefinitionSelectForLogger } from '@/lib/db/selects'

const exerciseInclude = {
  prescribedSets: { orderBy: { setNumber: 'asc' as const } },
  exerciseDefinition: { select: exerciseDefinitionSelectForLogger },
} satisfies Prisma.ExerciseInclude
```

### Compose when you need extra fields

If one route needs the canonical shape *plus* a field or two, spread:

```typescript
exerciseDefinition: {
  select: {
    ...exerciseDefinitionSelectForLogger,
    isSystem: true,
    createdBy: true,
  },
},
```

The spread is type-checked. If the canonical shape gains a new field
tomorrow, this route gets it too.

### When to define a new variant vs. spread

- **Spread** when one or two routes need a small addition. Keeps the
  number of named constants low.
- **New named variant** when three or more routes share the same
  superset, OR when the extension is a distinct conceptual surface
  (`exerciseDefinitionSelectForAdmin`, `...ForSearch`).

Do not proliferate variants for single-use cases. Do not shy away from
naming a pattern that repeats.

### Narrowing

Need *fewer* fields than the canonical (e.g., just `id` and `name`)?
Don't pick `forLogger` and ignore the extras — overfetching adds up and
the wire shape becomes ambiguous. Define a narrower named variant
(`exerciseDefinitionSelectForList`, etc.) or inline if truly one-off.

### Deriving types

The killer feature. Get a TypeScript type *out of* the select constant
via `Prisma.GetPayload`:

```typescript
export type ExerciseDefinitionForLogger = Prisma.ExerciseDefinitionGetPayload<{
  select: typeof exerciseDefinitionSelectForLogger
}>
```

Now this type can be used as a prop type for any component that consumes
the shape — the DB query, the API response, and the React prop type are
all linked. Adding a field updates the type everywhere; TypeScript flags
consumers that need to handle it.

## Contract tests

For every canonical select, write a contract test asserting the required
keys:

```typescript
// __tests__/api/exercise-definition-select-contract.test.ts
import { exerciseDefinitionSelectForLogger } from '@/lib/db/selects'

describe('exerciseDefinitionSelectForLogger', () => {
  const REQUIRED = ['id', 'name', 'imageUrls', /* ... */] as const
  for (const field of REQUIRED) {
    it(`includes "${field}"`, () => {
      expect(exerciseDefinitionSelectForLogger).toHaveProperty(field, true)
    })
  }
})
```

The test asserts the *shape definition* itself. If someone removes a
field thinking nothing depends on it, CI fails before merge, forcing
them to either restore the field or audit every consumer.

This won't catch a route that drifted away from the canonical shape
(e.g., reverted to an inline `select` missing fields). That's caught by
code review and by the quality-check agent's sweep.

## When this pattern is the wrong fit

Signs you've outgrown named-select constants and should consider richer
options (repository functions, tRPC, GraphQL):

- The same select is used 10+ places and every change ripples loudly
- You're doing post-query transformation (computed fields, joins in
  memory) that doesn't fit `select` syntax
- API responses diverge from DB shape in ways that matter (different
  field names, computed `daysSince`)
- Maintaining parallel "select" and "transform" code paths

Ripit is nowhere near that threshold. Named selects are the right tool
for this stage.

## For agents

The `quality-check` and `autopilot` agents are told to:

- Use the canonical select when writing a new route that returns
  `ExerciseDefinition`
- Flag inline selects of `ExerciseDefinition` that duplicate the
  canonical shape
- Suggest contract tests for newly-added canonical selects

If you add a new canonical select for a different entity, update the
agent prompts so they know to apply the same pattern.
