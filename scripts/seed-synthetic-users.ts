/**
 * Synthetic user seeder — populates a dev database with archetype users and
 * full workout history so downstream Suggest work (payload builder, aggregates,
 * eval canaries) is testable without real user data. See issue #910 and
 * docs/SUGGEST_PAYLOAD_SPEC.md (data_maturity, detraining_gap, rare events).
 *
 * Archetypes reuse the eval loop's definitions (lib/eval/scenario-generator.ts)
 * rather than inventing a parallel set. Each seeded user maps to one archetype:
 *
 * - beginner       -> data_maturity `cold_start`. 2 sessions in the last week,
 *                     dumbbell/machine/bodyweight only, NO RPE logged, includes
 *                     bodyweight exercises (Push-Up at weight 0).
 * - inconsistent   -> `partial` + RETURN-FROM-LAYOFF. 7 sessions over ~8 weeks,
 *                     most recent 12 days ago (detraining_gap >= 10d with >= 3
 *                     qualifying sessions before the gap). Sporadic RPE, one
 *                     abandoned session.
 * - cyclist        -> `established` + DELOAD WEEK. ~18 upper-dominant sessions
 *                     over ~8 weeks; last 7 days at ~50% volume / 80% load.
 *                     Warmup sets on compounds, MIXED WEIGHT UNITS (dumbbell
 *                     work logged in kg), RPE-logged, legs deliberately sparse.
 * - bodybuilder    -> `established` + VOLUME SPIKE. 3 sessions/week chronic,
 *                     then 6 elevated-volume sessions in the last 7 days
 *                     (acute:chronic well above 1.5). RPE-logged, warmups.
 * - powerlifter    -> `established` + ABANDONED SESSION. Low-rep heavy work
 *                     with 3-set warmup ramps, RPE 9 logged, one abandoned
 *                     session 4 days ago with partial logged sets.
 *
 * Idempotent per archetype: re-running deletes and recreates that archetype's
 * user data (deterministic user ids `synthetic-<archetype>`), so there are
 * never duplicates. Histories are seeded-RNG deterministic relative to "now".
 *
 * Usage (fresh worktree DB — exercise definitions must be seeded, which
 * scripts/start-postgres.sh does on startup):
 *
 *   doppler run --config dev_personal -- npx tsx scripts/seed-synthetic-users.ts
 *
 * In a worktree, override the port-mapped database explicitly if needed:
 *
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:<PG_PORT>/ripit \
 *     DIRECT_URL=$DATABASE_URL npx tsx scripts/seed-synthetic-users.ts
 *
 * Each user can log in as <archetype>@synthetic.test / password.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createRng } from '../lib/eval/rng'
import { ARCHETYPES } from '../lib/eval/scenario-generator'
import {
  type ArchetypePlan,
  buildArchetypePlans,
  buildSets,
  normalizeName,
} from '../lib/eval/synthetic-history'
import type { ArchetypeKey } from '../lib/eval/types'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Database plumbing
// ---------------------------------------------------------------------------

async function getExDefLookup(): Promise<Map<string, string>> {
  const defs = await prisma.exerciseDefinition.findMany({
    where: { isSystem: true },
    select: { id: true, normalizedName: true },
  })
  return new Map(defs.map((d) => [d.normalizedName, d.id]))
}

function userIdFor(archetype: ArchetypeKey): string {
  return `synthetic-${archetype}`
}

async function deleteArchetypeData(userId: string): Promise<void> {
  // Completions cascade their attached Exercises and LoggedSets.
  await prisma.workoutCompletion.deleteMany({ where: { userId } })
  await prisma.program.deleteMany({ where: { userId } })
  await prisma.exercise.deleteMany({ where: { userId } }) // strays
  await prisma.userTrainingProfile.deleteMany({ where: { userId } })
  await prisma.userSettings.deleteMany({ where: { userId } })
}

async function upsertUser(
  userId: string,
  displayName: string,
  email: string,
  createdAt: Date,
  pwHash: string,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (${userId}, ${displayName}, ${email}, true, ${createdAt}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, email = EXCLUDED.email, "updatedAt" = CURRENT_TIMESTAMP`
  await prisma.$executeRaw`
    INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (${`${userId}-account`}, ${userId}, 'credential', ${userId}, ${pwHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, "updatedAt" = CURRENT_TIMESTAMP`
}

function sessionDate(daysAgo: number, hour: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 30, 0, 0)
  return d
}

async function seedArchetype(
  archetype: ArchetypeKey,
  plan: ArchetypePlan,
  lookup: Map<string, string>,
  pwHash: string,
): Promise<void> {
  const spec = ARCHETYPES[archetype]
  const userId = userIdFor(archetype)
  const email = `${archetype}@synthetic.test`
  const rng = createRng(`synthetic-seed-${archetype}`)

  await deleteArchetypeData(userId)

  const maxDaysAgo = Math.max(...plan.sessions.map((s) => s.daysAgo))
  const accountCreatedAt = sessionDate(maxDaysAgo + 3, 9)
  await upsertUser(userId, plan.displayName, email, accountCreatedAt, pwHash)

  await prisma.userSettings.create({
    data: {
      userId,
      displayName: plan.displayName,
      defaultWeightUnit: 'lbs',
      intensityEnabled: plan.rpeMode !== 'never',
      defaultIntensityRating: 'rpe',
      experienceLevel: plan.experienceLevel,
      onboardingCompleted: true,
    },
  })

  await prisma.userTrainingProfile.create({
    data: {
      userId,
      goalSentences: spec.goals,
      weeklyIntent: spec.weeklyIntents,
      equipmentAvailable: spec.equipment,
      bannedExerciseIds: [],
      ratioTargets: spec.ratioTargets,
      defaultIntensityPreference: spec.intensityPreference,
    },
  })

  let sessionCount = 0
  let setCount = 0

  for (const s of plan.sessions) {
    const completedAt = sessionDate(s.daysAgo, 17)
    const startedAt = new Date(completedAt.getTime() - 55 * 60 * 1000)

    const completion = await prisma.workoutCompletion.create({
      data: {
        userId,
        status: s.status,
        isAdHoc: true,
        name: s.template.name,
        startedAt,
        completedAt,
        notes: s.note ?? null,
      },
    })

    const exercises = s.exerciseLimit
      ? s.template.exercises.slice(0, s.exerciseLimit)
      : s.template.exercises

    for (let order = 0; order < exercises.length; order++) {
      const ex = exercises[order]
      const defId = lookup.get(normalizeName(ex.name))
      if (!defId) {
        console.warn(`  WARNING: no ExerciseDefinition for "${ex.name}" — skipping`)
        continue
      }

      const sets = buildSets(ex, s, plan.rpeMode, spec.typicalRpe, rng)
      await prisma.exercise.create({
        data: {
          name: ex.name,
          exerciseDefinitionId: defId,
          order: order + 1,
          userId,
          workoutCompletionId: completion.id,
          loggedSets: {
            create: sets.map((set) => ({
              ...set,
              completionId: completion.id,
              userId,
              createdAt: completedAt,
            })),
          },
        },
      })
      setCount += sets.length
    }
    sessionCount++
  }

  console.log(
    `Seeded ${archetype} (${email}): ${sessionCount} sessions, ${setCount} logged sets`,
  )
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const lookup = await getExDefLookup()
  if (lookup.size === 0) {
    throw new Error(
      'No system ExerciseDefinitions found — seed exercises first (scripts/start-postgres.sh does this on startup)',
    )
  }

  const pwHash = await bcrypt.hash('password', 10)
  const plans = buildArchetypePlans()

  for (const archetype of Object.keys(plans) as ArchetypeKey[]) {
    await seedArchetype(archetype, plans[archetype], lookup, pwHash)
  }

  console.log('Synthetic users seeded. Log in as <archetype>@synthetic.test / password')
}

main()
  .catch((error) => {
    console.error('Synthetic seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
