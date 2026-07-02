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

import { ARCHETYPES } from '../lib/eval/scenario-generator'
import { createRng, type Rng } from '../lib/eval/rng'
import type { ArchetypeKey } from '../lib/eval/types'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------

type WeightUnit = 'lbs' | 'kg'
type RpeMode = 'always' | 'sometimes' | 'never'

interface ExercisePlan {
  /** Must match a seeded ExerciseDefinition name (normalized lookup). */
  name: string
  /** Working sets at full volume. */
  sets: number
  /** Target reps per working set (jittered +/- 1). */
  reps: number
  /** Base top-set weight in `unit`. Ignored when bodyweight. */
  base: number
  /** Warmup ramp sets before working sets (50/70/85% of working weight). */
  warmups?: number
  bodyweight?: boolean
  unit?: WeightUnit
}

interface WorkoutTemplate {
  name: string
  exercises: ExercisePlan[]
}

interface SessionPlan {
  daysAgo: number
  template: WorkoutTemplate
  status: 'completed' | 'abandoned'
  /** Multiplier on working weight (deload = 0.8). */
  loadScale: number
  /** Multiplier on working-set count (deload = 0.5, spike = 1.3). */
  setScale: number
  /** 0..1 position in the training block, drives linear progression. */
  progress: number
  /** Abandoned sessions log only the first N exercises. */
  exerciseLimit?: number
  note?: string
}

interface ArchetypePlan {
  displayName: string
  rpeMode: RpeMode
  experienceLevel: string
  sessions: SessionPlan[]
}

// ---------------------------------------------------------------------------
// Workout templates (exercise names verified against prisma/seeds/*.sql)
// ---------------------------------------------------------------------------

const CYCLIST_PUSH: WorkoutTemplate = {
  name: 'Push Day',
  exercises: [
    { name: 'Barbell Bench Press', sets: 4, reps: 8, base: 185, warmups: 2 },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 10, base: 28, unit: 'kg' },
    { name: 'Cable Chest Fly', sets: 3, reps: 12, base: 35 },
    { name: 'Lateral Raise', sets: 3, reps: 15, base: 20 },
    { name: 'Tricep Pushdown', sets: 3, reps: 12, base: 45 },
  ],
}

const CYCLIST_PULL: WorkoutTemplate = {
  name: 'Pull Day',
  exercises: [
    { name: 'Lat Pulldown', sets: 4, reps: 10, base: 160, warmups: 1 },
    { name: 'Seated Cable Row', sets: 3, reps: 10, base: 155 },
    { name: 'Pull-Up', sets: 3, reps: 8, base: 0, bodyweight: true },
    { name: 'Face Pull', sets: 3, reps: 15, base: 30 },
    { name: 'Dumbbell Curl', sets: 3, reps: 12, base: 14, unit: 'kg' },
  ],
}

const CYCLIST_LEGS: WorkoutTemplate = {
  name: 'Token Leg Day',
  exercises: [
    { name: 'Goblet Squat', sets: 3, reps: 10, base: 24, unit: 'kg' },
    { name: 'Leg Press', sets: 3, reps: 12, base: 270 },
    { name: 'Leg Curl', sets: 3, reps: 12, base: 80 },
  ],
}

const BB_CHEST_BACK: WorkoutTemplate = {
  name: 'Chest & Back',
  exercises: [
    { name: 'Barbell Bench Press', sets: 4, reps: 10, base: 205, warmups: 2 },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 10, base: 65 },
    { name: 'Lat Pulldown', sets: 4, reps: 10, base: 180 },
    { name: 'Seated Cable Row', sets: 3, reps: 10, base: 165 },
    { name: 'Cable Chest Fly', sets: 3, reps: 12, base: 40 },
  ],
}

const BB_LEGS: WorkoutTemplate = {
  name: 'Leg Day',
  exercises: [
    { name: 'Barbell Back Squat', sets: 4, reps: 10, base: 225, warmups: 2 },
    { name: 'Romanian Deadlift', sets: 3, reps: 10, base: 220 },
    { name: 'Leg Extension', sets: 3, reps: 12, base: 100 },
    { name: 'Leg Curl', sets: 3, reps: 12, base: 90 },
    { name: 'Calf Raise', sets: 4, reps: 15, base: 150 },
  ],
}

const BB_SHOULDERS_ARMS: WorkoutTemplate = {
  name: 'Shoulders & Arms',
  exercises: [
    { name: 'Overhead Press', sets: 4, reps: 10, base: 115, warmups: 1 },
    { name: 'Lateral Raise', sets: 4, reps: 15, base: 25 },
    { name: 'Face Pull', sets: 4, reps: 15, base: 35 },
    { name: 'Dumbbell Curl', sets: 3, reps: 12, base: 30 },
    { name: 'Tricep Pushdown', sets: 3, reps: 12, base: 50 },
  ],
}

const PL_SQUAT: WorkoutTemplate = {
  name: 'Squat Day',
  exercises: [
    { name: 'Barbell Back Squat', sets: 5, reps: 3, base: 315, warmups: 3 },
    { name: 'Leg Press', sets: 3, reps: 8, base: 350 },
    { name: 'Leg Curl', sets: 3, reps: 10, base: 90 },
  ],
}

const PL_BENCH: WorkoutTemplate = {
  name: 'Bench Day',
  exercises: [
    { name: 'Barbell Bench Press', sets: 5, reps: 3, base: 245, warmups: 3 },
    { name: 'Overhead Press', sets: 3, reps: 6, base: 135 },
    { name: 'Barbell Row', sets: 3, reps: 8, base: 185 },
    { name: 'Tricep Pushdown', sets: 3, reps: 10, base: 50 },
  ],
}

const PL_DEADLIFT: WorkoutTemplate = {
  name: 'Deadlift Day',
  exercises: [
    { name: 'Conventional Deadlift', sets: 4, reps: 2, base: 405, warmups: 3 },
    { name: 'Front Squat', sets: 3, reps: 5, base: 225 },
    { name: 'Lat Pulldown', sets: 3, reps: 8, base: 170 },
  ],
}

const BEGINNER_A: WorkoutTemplate = {
  name: 'Full Body A',
  exercises: [
    { name: 'Goblet Squat', sets: 3, reps: 10, base: 40 },
    { name: 'Dumbbell Bench Press', sets: 3, reps: 10, base: 40 },
    { name: 'Lat Pulldown', sets: 3, reps: 10, base: 70 },
    { name: 'Standard Push-Up', sets: 2, reps: 10, base: 0, bodyweight: true },
  ],
}

const BEGINNER_B: WorkoutTemplate = {
  name: 'Full Body B',
  exercises: [
    { name: 'Leg Press', sets: 3, reps: 10, base: 140 },
    { name: 'Dumbbell Row', sets: 3, reps: 10, base: 35 },
    { name: 'Lateral Raise', sets: 2, reps: 12, base: 10 },
    { name: 'Standard Push-Up', sets: 2, reps: 8, base: 0, bodyweight: true },
  ],
}

const INCONSISTENT_A: WorkoutTemplate = {
  name: 'Quick Full Body',
  exercises: [
    { name: 'Barbell Back Squat', sets: 3, reps: 5, base: 185, warmups: 1 },
    { name: 'Dumbbell Bench Press', sets: 3, reps: 8, base: 60 },
    { name: 'Barbell Row', sets: 3, reps: 8, base: 135 },
  ],
}

const INCONSISTENT_B: WorkoutTemplate = {
  name: 'Push Pull',
  exercises: [
    { name: 'Barbell Bench Press', sets: 3, reps: 5, base: 155, warmups: 1 },
    { name: 'Lat Pulldown', sets: 3, reps: 8, base: 140 },
    { name: 'Tricep Pushdown', sets: 2, reps: 10, base: 40 },
  ],
}

// ---------------------------------------------------------------------------
// Session schedules
// ---------------------------------------------------------------------------

function session(
  daysAgo: number,
  template: WorkoutTemplate,
  maxDaysAgo: number,
  overrides: Partial<SessionPlan> = {},
): SessionPlan {
  return {
    daysAgo,
    template,
    status: 'completed',
    loadScale: 1,
    setScale: 1,
    progress: maxDaysAgo === 0 ? 1 : (maxDaysAgo - daysAgo) / maxDaysAgo,
    ...overrides,
  }
}

function buildPlans(): Record<ArchetypeKey, ArchetypePlan> {
  // cyclist: 7 weeks of 2 upper days/week + occasional leg day, then a deload week
  const cyclistSessions: SessionPlan[] = []
  for (let w = 0; w < 7; w++) {
    cyclistSessions.push(session(58 - w * 7, CYCLIST_PUSH, 58))
    cyclistSessions.push(session(55 - w * 7, CYCLIST_PULL, 58))
  }
  cyclistSessions.push(session(50, CYCLIST_LEGS, 58))
  cyclistSessions.push(session(29, CYCLIST_LEGS, 58))
  cyclistSessions.push(
    session(5, CYCLIST_PUSH, 58, { loadScale: 0.8, setScale: 0.5, note: 'Deload week — big ride block coming up' }),
    session(2, CYCLIST_PULL, 58, { loadScale: 0.8, setScale: 0.5, note: 'Deload week' }),
  )

  // bodybuilder: 3 sessions/week chronic, then a 6-session spike week
  const bbSessions: SessionPlan[] = []
  for (let w = 0; w < 7; w++) {
    bbSessions.push(session(57 - w * 7, BB_CHEST_BACK, 57))
    bbSessions.push(session(55 - w * 7, BB_LEGS, 57))
    bbSessions.push(session(53 - w * 7, BB_SHOULDERS_ARMS, 57))
  }
  bbSessions.push(
    session(6, BB_CHEST_BACK, 57, { setScale: 1.3 }),
    session(5, BB_LEGS, 57, { setScale: 1.3 }),
    session(4, BB_SHOULDERS_ARMS, 57, { setScale: 1.3 }),
    session(3, BB_CHEST_BACK, 57, { setScale: 1.3, note: 'Blast week — pushing volume before vacation' }),
    session(2, BB_LEGS, 57, { setScale: 1.3 }),
    session(1, BB_SHOULDERS_ARMS, 57, { setScale: 1.3 }),
  )

  // powerlifter: ~1.7 sessions/week over 9 weeks, one abandoned bench day
  const plDays: Array<[number, WorkoutTemplate]> = [
    [62, PL_SQUAT], [59, PL_BENCH], [55, PL_DEADLIFT],
    [52, PL_SQUAT], [48, PL_BENCH], [44, PL_DEADLIFT],
    [41, PL_SQUAT], [37, PL_BENCH], [33, PL_DEADLIFT],
    [27, PL_SQUAT], [20, PL_BENCH], [13, PL_DEADLIFT],
    [8, PL_SQUAT], [1, PL_DEADLIFT],
  ]
  const plSessions = plDays.map(([d, t]) => session(d, t, 62))
  plSessions.push(
    session(4, PL_BENCH, 62, {
      status: 'abandoned',
      exerciseLimit: 2,
      note: 'Shoulder felt off warming up, cut it short',
    }),
  )
  plSessions.sort((a, b) => b.daysAgo - a.daysAgo)

  // beginner: two sessions ever, both within the last week
  const beginnerSessions = [session(7, BEGINNER_A, 7), session(3, BEGINNER_B, 7)]

  // inconsistent: 7 sessions over ~8 weeks, then a 12-day layoff before "now"
  const inconsistentSessions = [
    session(55, INCONSISTENT_A, 55),
    session(50, INCONSISTENT_B, 55),
    session(45, INCONSISTENT_A, 55),
    session(38, INCONSISTENT_B, 55),
    session(33, INCONSISTENT_A, 55, {
      status: 'abandoned',
      exerciseLimit: 1,
      note: 'Got called back to work mid-session',
    }),
    session(26, INCONSISTENT_B, 55),
    session(12, INCONSISTENT_A, 55, { note: 'Squeezed one in before the work trip' }),
  ]

  return {
    beginner: {
      displayName: 'Synthetic Beginner',
      rpeMode: 'never',
      experienceLevel: 'beginner',
      sessions: beginnerSessions,
    },
    inconsistent: {
      displayName: 'Synthetic Inconsistent',
      rpeMode: 'sometimes',
      experienceLevel: 'intermediate',
      sessions: inconsistentSessions,
    },
    cyclist: {
      displayName: 'Synthetic Cyclist',
      rpeMode: 'always',
      experienceLevel: 'intermediate',
      sessions: cyclistSessions,
    },
    bodybuilder: {
      displayName: 'Synthetic Bodybuilder',
      rpeMode: 'always',
      experienceLevel: 'advanced',
      sessions: bbSessions,
    },
    powerlifter: {
      displayName: 'Synthetic Powerlifter',
      rpeMode: 'always',
      experienceLevel: 'advanced',
      sessions: plSessions,
    },
  }
}

// ---------------------------------------------------------------------------
// Set synthesis
// ---------------------------------------------------------------------------

interface SetData {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  isWarmup: boolean
}

function roundLoad(weight: number, unit: WeightUnit): number {
  const step = unit === 'kg' ? 2 : 5
  return Math.max(step, Math.round(weight / step) * step)
}

function buildSets(
  ex: ExercisePlan,
  plan: SessionPlan,
  rpeMode: RpeMode,
  typicalRpe: number,
  rng: Rng,
): SetData[] {
  const unit: WeightUnit = ex.unit ?? 'lbs'
  const workingWeight = ex.bodyweight
    ? 0
    : roundLoad(ex.base * plan.loadScale * (0.94 + 0.08 * plan.progress), unit)
  const workingSets = Math.max(1, Math.round(ex.sets * plan.setScale))

  const sets: SetData[] = []
  let setNumber = 1

  if (!ex.bodyweight && ex.warmups) {
    const ramp = [0.5, 0.7, 0.85].slice(3 - ex.warmups)
    for (const pct of ramp) {
      sets.push({
        setNumber: setNumber++,
        reps: rng.int(5, 8),
        weight: roundLoad(workingWeight * pct, unit),
        weightUnit: unit,
        rpe: null,
        isWarmup: true,
      })
    }
  }

  for (let i = 0; i < workingSets; i++) {
    let rpe: number | null = null
    if (rpeMode === 'always' || (rpeMode === 'sometimes' && rng.chance(0.5))) {
      rpe = Math.min(10, Math.max(5, typicalRpe + rng.int(-1, 0)))
    }
    sets.push({
      setNumber: setNumber++,
      reps: Math.max(1, ex.reps + rng.int(-1, 1)),
      weight: workingWeight,
      weightUnit: unit,
      rpe,
      isWarmup: false,
    })
  }

  return sets
}

// ---------------------------------------------------------------------------
// Database plumbing
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
}

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
  const plans = buildPlans()

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
