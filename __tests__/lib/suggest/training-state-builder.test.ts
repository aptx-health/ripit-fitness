import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRng } from '@/lib/eval/rng'
import { ARCHETYPES } from '@/lib/eval/scenario-generator'
import {
  ARCHETYPE_EXERCISE_TAGS,
  buildArchetypePlans,
  buildSets,
  normalizeName,
} from '@/lib/eval/synthetic-history'
import type { ArchetypeKey } from '@/lib/eval/types'
import { suggestWorkoutPayloadSchema } from '@/lib/llm/prompts/suggest-workout/schemas'
import { SIGNUP_INTENT_SENTENCES } from '@/lib/suggest/goal-sentences'
import {
  buildTrainingStatePayload,
  type SuggestRequestInput,
} from '@/lib/suggest/training-state-builder'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

const DAY_MS = 24 * 60 * 60 * 1000

// Fixed request time. 2026-07-01 is a Wednesday (asserted via today_dow in the
// snapshot). Sessions are seeded exactly `daysAgo` days before this instant so
// every days_ago is deterministic.
const NOW = new Date('2026-07-01T18:00:00.000Z')

const REQUEST: SuggestRequestInput = {
  time_budget_minutes: 45,
  intensity_vibe: 'solid',
  deprioritize_freetext: null,
  prioritize_freetext: null,
  equipment_override: null,
}

/** Create a fixture ExerciseDefinition for every archetype exercise, with
 * deterministic ids so the candidate list (sorted by id) is stable. */
async function seedExerciseDefinitions(prisma: PrismaClient): Promise<Map<string, string>> {
  const lookup = new Map<string, string>()
  for (const [name, t] of Object.entries(ARCHETYPE_EXERCISE_TAGS)) {
    const normalized = normalizeName(name)
    const id = `def-${normalized.replace(/[^a-z0-9]+/g, '-')}`
    await prisma.exerciseDefinition.create({
      data: {
        id,
        name,
        normalizedName: normalized,
        aliases: [],
        userId: 'system-fixture',
        isSystem: true,
        equipment: t.equipment,
        primaryFAUs: t.primaryFAUs,
        secondaryFAUs: t.secondaryFAUs,
        movementPattern: t.movementPattern,
        intensityClass: t.intensityClass,
        isBodyweight: t.isBodyweight,
      },
    })
    lookup.set(normalized, id)
  }
  return lookup
}

/** Seed one archetype's full training history at the fixed NOW. Mirrors the dev
 * seeder's per-session loop (same RNG seed → identical sets) but writes rows
 * relative to NOW and uses the fixture definitions. */
async function seedArchetypeHistory(
  prisma: PrismaClient,
  userId: string,
  archetype: ArchetypeKey,
  lookup: Map<string, string>,
): Promise<void> {
  const plan = buildArchetypePlans()[archetype]
  const spec = ARCHETYPES[archetype]
  const rng = createRng(`synthetic-seed-${archetype}`)

  for (const s of plan.sessions) {
    const completedAt = new Date(NOW.getTime() - s.daysAgo * DAY_MS)
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
      if (!defId) throw new Error(`No fixture ExerciseDefinition for "${ex.name}"`)
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
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              weightUnit: set.weightUnit,
              rpe: set.rpe,
              isWarmup: set.isWarmup,
              completionId: completion.id,
              userId,
              createdAt: completedAt,
            })),
          },
        },
      })
    }
  }
}

/** Seed the archetype's profile. Beginner gets EMPTY goalSentences + structured
 * wizard fields so goal-sentence synthesis runs (cold-start contract); the rest
 * mirror the seeder's interview-produced pass-through profile. */
async function seedProfile(
  prisma: PrismaClient,
  userId: string,
  archetype: ArchetypeKey,
): Promise<void> {
  if (archetype === 'beginner') {
    await prisma.userSettings.create({ data: { userId, signupIntent: 'new_to_apps' } })
    await prisma.userTrainingProfile.create({
      data: {
        userId,
        goalSentences: [],
        weeklyIntent: ['Train 2-3x per week, full body'],
        equipmentAvailable: ['dumbbells', 'machines', 'bodyweight'],
        bannedExerciseIds: [],
        ratioTargets: {},
        defaultIntensityPreference: null,
        goalCategories: [
          { category: 'get_stronger', importance: 5 },
          { category: 'build_muscle', importance: 3 },
        ],
        patternPreference: 'full_body',
        targetSessionsPerWeek: 3,
        targetMinutesPerSession: 45,
        injuryAreas: [{ area: 'knee', severity: 'caution' }],
      },
    })
    return
  }

  const spec = ARCHETYPES[archetype]
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
}

/** Expected synthesized beginner goal_sentences, asserted verbatim (spec rule 16). */
const EXPECTED_BEGINNER_GOAL_SENTENCES = [
  'Get stronger (top priority).',
  'Build muscle (medium priority).',
  'Aims for 3 sessions/week, ~45 min each.',
  'Prefers a full-body split.',
  'Mindful of injury: knee.',
  SIGNUP_INTENT_SENTENCES.new_to_apps,
]

type Payload = Awaited<ReturnType<typeof buildTrainingStatePayload>>['payload']

const ARCHETYPE_ASSERTIONS: Record<ArchetypeKey, (p: Payload) => void> = {
  beginner: (p) => {
    expect(p.data_maturity).toBe('cold_start')
    // Cold start: <3 obs/pattern → no calibration; every FAU low_data, status omitted.
    expect(p.training_state.per_movement_calibration).toEqual([])
    expect(p.training_state.per_fau.every((f) => f.low_data)).toBe(true)
    expect(p.training_state.per_fau.every((f) => f.status === undefined)).toBe(true)
    // Synthesized goal sentences, verbatim.
    expect(p.durable_profile.goal_sentences).toEqual(EXPECTED_BEGINNER_GOAL_SENTENCES)
  },
  inconsistent: (p) => {
    expect(p.data_maturity).toBe('partial')
    expect(p.training_state.detraining_gap).not.toBeNull()
    expect(p.training_state.detraining_gap?.days).toBeGreaterThanOrEqual(10)
  },
  cyclist: (p) => {
    expect(p.data_maturity).toBe('established')
    // Deload week: acute load well below chronic baseline.
    expect(p.training_state.acute_chronic_ratio).not.toBeNull()
    expect(p.training_state.acute_chronic_ratio as number).toBeLessThan(1)
  },
  bodybuilder: (p) => {
    expect(p.data_maturity).toBe('established')
    // Volume-spike week: acute load above chronic baseline.
    expect(p.training_state.acute_chronic_ratio).not.toBeNull()
    expect(p.training_state.acute_chronic_ratio as number).toBeGreaterThan(1)
  },
  powerlifter: (p) => {
    expect(p.data_maturity).toBe('established')
    expect(p.training_state.recent_sessions.some((s) => s.abandoned)).toBe(true)
  },
}

const ARCHETYPE_KEYS = Object.keys(ARCHETYPE_ASSERTIONS) as ArchetypeKey[]

describe('buildTrainingStatePayload — golden archetype canaries', () => {
  let prisma: PrismaClient
  let lookup: Map<string, string>

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    lookup = await seedExerciseDefinitions(prisma)
  })

  it.each(ARCHETYPE_KEYS)('assembles a valid payload for the %s archetype', async (archetype) => {
    const user = await createTestUser()
    await seedProfile(prisma, user.id, archetype)
    await seedArchetypeHistory(prisma, user.id, archetype, lookup)

    const { payload } = await buildTrainingStatePayload(prisma, user.id, REQUEST, NOW)

    // The builder validates internally; re-assert the contract explicitly.
    expect(suggestWorkoutPayloadSchema.safeParse(payload).success).toBe(true)
    expect(payload.candidate_exercises.length).toBeGreaterThan(0)
    expect(payload.training_state.now).toBe(NOW.toISOString())
    expect(payload.training_state.today_dow).toBe('wednesday')

    ARCHETYPE_ASSERTIONS[archetype](payload)

    // Permanent golden canary for the eval loop.
    expect(payload).toMatchSnapshot()
  })

  it('truncates recent-session notes to 120 chars and caps at 5 per session', async () => {
    const user = await createTestUser()
    await prisma.userTrainingProfile.create({
      data: {
        userId: user.id,
        goalSentences: ['Stay healthy'],
        weeklyIntent: [],
        equipmentAvailable: ['dumbbells', 'machines'],
        bannedExerciseIds: [],
        ratioTargets: {},
        defaultIntensityPreference: null,
      },
    })

    const completedAt = new Date(NOW.getTime() - 2 * DAY_MS)
    const completion = await prisma.workoutCompletion.create({
      data: {
        userId: user.id,
        status: 'completed',
        isAdHoc: true,
        name: 'Notes Test',
        startedAt: new Date(completedAt.getTime() - 60 * 60 * 1000),
        completedAt,
      },
    })
    const defId = lookup.get(normalizeName('Goblet Squat')) as string
    const longNote = 'a'.repeat(200)
    for (let i = 0; i < 6; i++) {
      await prisma.exercise.create({
        data: {
          name: `Exercise ${i}`,
          exerciseDefinitionId: defId,
          order: i + 1,
          userId: user.id,
          notes: longNote,
          workoutCompletionId: completion.id,
          loggedSets: {
            create: [
              {
                setNumber: 1,
                reps: 10,
                weight: 100,
                weightUnit: 'lbs',
                isWarmup: false,
                completionId: completion.id,
                userId: user.id,
                createdAt: completedAt,
              },
            ],
          },
        },
      })
    }

    const { payload } = await buildTrainingStatePayload(prisma, user.id, REQUEST, NOW)
    const recent = payload.training_state.recent_sessions
    expect(recent).toHaveLength(1)
    expect(recent[0].notes).toHaveLength(5) // capped at 5 per session
    expect(recent[0].notes[0].text).toHaveLength(120) // truncated to ~120 chars
    expect(recent[0].total_sets).toBe(6)
    expect(recent[0].duration_min).toBe(60)
  })
})
