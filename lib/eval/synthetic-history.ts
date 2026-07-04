/**
 * Deterministic synthetic training-history generation, shared by the dev
 * seeder (scripts/seed-synthetic-users.ts) and the training-state-builder
 * golden canary tests (issue #920). Extracting it here keeps ONE source of
 * truth for the archetype histories so the goldens exercise the exact
 * signatures the seeder produces (cold-start, return-from-layoff, deload,
 * volume-spike, abandoned-session).
 *
 * Everything here is pure: the workout templates, the per-archetype session
 * schedules, and the seeded-RNG set synthesis. Callers supply `now` and an
 * exercise-definition name→id lookup and turn the output into rows.
 */

import type { Rng } from './rng'
import type { ArchetypeKey } from './types'

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------

export type WeightUnit = 'lbs' | 'kg'
export type RpeMode = 'always' | 'sometimes' | 'never'

export interface ExercisePlan {
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

export interface WorkoutTemplate {
  name: string
  exercises: ExercisePlan[]
}

export interface SessionPlan {
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

export interface ArchetypePlan {
  displayName: string
  rpeMode: RpeMode
  experienceLevel: string
  sessions: SessionPlan[]
}

export interface SetData {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  isWarmup: boolean
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

/** Build the per-archetype session schedules. Pure; identical every call. */
export function buildArchetypePlans(): Record<ArchetypeKey, ArchetypePlan> {
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

function roundLoad(weight: number, unit: WeightUnit): number {
  const step = unit === 'kg' ? 2 : 5
  return Math.max(step, Math.round(weight / step) * step)
}

/** Synthesize the logged sets for one planned exercise in one session. */
export function buildSets(
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

/** Normalize an exercise name for definition lookup (matches the seed rule). */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
}

// ---------------------------------------------------------------------------
// Exercise tag table
// ---------------------------------------------------------------------------

/** The tag subset the training-state builder / aggregates read from an
 * ExerciseDefinition. In production these come from the system seed + auto-tag
 * pass; the golden tests create fixture definitions from this table so the
 * canaries don't depend on the LLM auto-tagger having run. */
export interface ExerciseTag {
  equipment: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  movementPattern: string | null
  intensityClass: 'heavy' | 'moderate' | 'light'
  isBodyweight: boolean
}

function tag(
  equipment: string[],
  movementPattern: string | null,
  primaryFAUs: string[],
  secondaryFAUs: string[],
  intensityClass: ExerciseTag['intensityClass'],
  isBodyweight = false,
): ExerciseTag {
  return { equipment, movementPattern, primaryFAUs, secondaryFAUs, intensityClass, isBodyweight }
}

/**
 * Every exercise name referenced by the archetype templates, with plausible
 * tags. Keys are the exact template names; the lookup uses {@link normalizeName}.
 */
export const ARCHETYPE_EXERCISE_TAGS: Record<string, ExerciseTag> = {
  'Barbell Bench Press': tag(['barbell'], 'horizontal_push', ['chest', 'triceps'], ['front-delts'], 'heavy'),
  'Incline Dumbbell Press': tag(['dumbbell', 'bench'], 'horizontal_push', ['chest', 'front-delts'], ['triceps'], 'moderate'),
  'Cable Chest Fly': tag(['cable'], 'isolation', ['chest'], ['front-delts'], 'light'),
  'Lateral Raise': tag(['dumbbell'], 'isolation', ['side-delts'], [], 'light'),
  'Tricep Pushdown': tag(['cable'], 'isolation', ['triceps'], [], 'light'),
  'Lat Pulldown': tag(['cable'], 'vertical_pull', ['lats'], ['biceps', 'mid-back'], 'moderate'),
  'Seated Cable Row': tag(['cable'], 'horizontal_pull', ['mid-back', 'lats'], ['biceps'], 'moderate'),
  'Pull-Up': tag(['bodyweight', 'pull_up_bar'], 'vertical_pull', ['lats'], ['biceps', 'mid-back'], 'heavy', true),
  'Face Pull': tag(['cable'], 'horizontal_pull', ['rear-delts'], ['traps'], 'light'),
  'Dumbbell Curl': tag(['dumbbell'], 'isolation', ['biceps'], ['forearms'], 'light'),
  'Goblet Squat': tag(['dumbbell'], 'squat', ['quads'], ['glutes'], 'moderate'),
  'Leg Press': tag(['machine'], 'squat', ['quads'], ['glutes', 'hamstrings'], 'moderate'),
  'Leg Curl': tag(['machine'], 'isolation', ['hamstrings'], [], 'light'),
  'Barbell Back Squat': tag(['barbell'], 'squat', ['quads', 'glutes'], ['hamstrings'], 'heavy'),
  'Romanian Deadlift': tag(['barbell'], 'hinge', ['hamstrings', 'glutes'], ['lower-back'], 'heavy'),
  'Leg Extension': tag(['machine'], 'isolation', ['quads'], [], 'light'),
  'Calf Raise': tag(['machine'], 'isolation', ['calves'], [], 'light'),
  'Overhead Press': tag(['barbell'], 'vertical_push', ['front-delts', 'side-delts'], ['triceps'], 'heavy'),
  'Conventional Deadlift': tag(['barbell'], 'hinge', ['glutes', 'hamstrings', 'lower-back'], ['traps'], 'heavy'),
  'Front Squat': tag(['barbell'], 'squat', ['quads'], ['glutes'], 'heavy'),
  'Barbell Row': tag(['barbell'], 'horizontal_pull', ['mid-back', 'lats'], ['biceps'], 'moderate'),
  'Dumbbell Bench Press': tag(['dumbbell', 'bench'], 'horizontal_push', ['chest', 'triceps'], ['front-delts'], 'moderate'),
  'Standard Push-Up': tag(['bodyweight'], 'horizontal_push', ['chest', 'triceps'], ['front-delts'], 'moderate', true),
  'Dumbbell Row': tag(['dumbbell'], 'horizontal_pull', ['mid-back', 'lats'], ['biceps'], 'moderate'),
}
