import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { computeUserAggregates, recomputeUserAggregates } from '@/lib/aggregates/recompute'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

const DAY = 24 * 60 * 60 * 1000
// Wednesday 2026-07-01 — current partial ISO week is Mon 06-29 .. now.
const NOW = new Date('2026-07-01T12:00:00Z')

let defCounter = 0

async function createDef(
  prisma: PrismaClient,
  opts: {
    primaryFAUs: string[]
    movementPattern?: string | null
    isBodyweight?: boolean
    intensityClass?: string | null
  }
): Promise<string> {
  defCounter += 1
  const name = `Test Def ${defCounter}`
  const def = await prisma.exerciseDefinition.create({
    data: {
      name,
      normalizedName: `test def ${defCounter}`,
      aliases: [],
      equipment: opts.isBodyweight ? ['bodyweight'] : ['barbell'],
      primaryFAUs: opts.primaryFAUs,
      secondaryFAUs: [],
      isSystem: true,
      userId: '00000000-0000-0000-0000-000000000000',
      movementPattern: opts.movementPattern ?? null,
      isBodyweight: opts.isBodyweight ?? false,
      intensityClass: opts.intensityClass ?? null,
    },
  })
  return def.id
}

/** Seed the user's training profile (ratioTargets drives shares; goalSentences drives goal_progress). */
async function seedProfile(
  prisma: PrismaClient,
  userId: string,
  opts: { ratioTargets?: Record<string, number>; goalSentences?: string[] }
): Promise<void> {
  await prisma.userTrainingProfile.create({
    data: {
      userId,
      ratioTargets: opts.ratioTargets ?? {},
      goalSentences: opts.goalSentences ?? [],
    },
  })
}

interface SetSpec {
  weight?: number
  weightUnit?: string
  reps?: number
  rpe?: number | null
  rir?: number | null
  isWarmup?: boolean
}

async function seedSession(
  prisma: PrismaClient,
  userId: string,
  defId: string,
  opts: { daysAgo: number; status?: string; sets: SetSpec[] }
): Promise<void> {
  const completedAt = new Date(NOW.getTime() - opts.daysAgo * DAY)
  const completion = await prisma.workoutCompletion.create({
    data: {
      userId,
      status: opts.status ?? 'completed',
      completedAt,
      isAdHoc: true,
    },
  })
  const exercise = await prisma.exercise.create({
    data: {
      name: 'Test Exercise',
      exerciseDefinitionId: defId,
      order: 0,
      userId,
      workoutCompletionId: completion.id,
    },
  })
  let setNumber = 1
  for (const s of opts.sets) {
    await prisma.loggedSet.create({
      data: {
        completionId: completion.id,
        exerciseId: exercise.id,
        userId,
        setNumber: setNumber++,
        reps: s.reps ?? 5,
        weight: s.weight ?? 100,
        weightUnit: s.weightUnit ?? 'lbs',
        rpe: s.rpe ?? null,
        rir: s.rir ?? null,
        isWarmup: s.isWarmup ?? false,
      },
    })
  }
}

/** N working sets of a chest press. */
function chestSets(n: number, over: SetSpec = {}): SetSpec[] {
  return Array.from({ length: n }, () => ({ weight: 185, reps: 5, rir: 2, ...over }))
}

describe('UserTrainingAggregates recompute', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
  })

  it('produces a valid row with nulls for a zero-history user (no crash)', async () => {
    const agg = await recomputeUserAggregates(prisma, userId, NOW)

    expect(agg.dataMaturity).toBe('cold_start')
    expect(agg.sessionsLast7d).toBe(0)
    expect(agg.daysSinceAnySession).toBeNull()
    expect(agg.lastSessionAt).toBeNull()
    expect(agg.firstSessionAt).toBeNull()
    expect(agg.qualifyingSessionsTotal).toBe(0)
    expect(agg.totalWeeklySetsBaseline).toBeNull()
    expect(agg.acuteChronicRatio).toBeNull()
    expect(agg.detrainingGapDays).toBeNull()
    expect(agg.perFau).toEqual([])
    expect(agg.perMovementCalibration).toEqual([])

    // Persisted and retrievable.
    const row = await prisma.userTrainingAggregates.findUnique({ where: { userId } })
    expect(row).not.toBeNull()
    expect(row?.dataMaturity).toBe('cold_start')
    expect(row?.perFau).toEqual([])
  })

  it('computeUserAggregates returns aggregates without persisting (dry run)', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    for (const daysAgo of [2, 5, 9]) {
      await seedSession(prisma, userId, chest, { daysAgo, sets: chestSets(7) })
    }

    const agg = await computeUserAggregates(prisma, userId, NOW)
    expect(agg.perFau.find((f) => f.fau === 'chest')?.rolling_14d_sets).toBe(21)

    // Nothing written.
    const row = await prisma.userTrainingAggregates.findUnique({ where: { userId } })
    expect(row).toBeNull()
  })

  it('honors threshold overrides from the options object', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    // 3 sessions, 20 sets -> low_data false at defaults...
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 9, sets: chestSets(6) })

    const dflt = await computeUserAggregates(prisma, userId, NOW)
    expect(dflt.perFau.find((f) => f.fau === 'chest')?.low_data).toBe(false)

    // ...but low_data true when the set floor is raised past 20.
    const strict = await computeUserAggregates(prisma, userId, NOW, { lowDataMinSets: 25 })
    expect(strict.perFau.find((f) => f.fau === 'chest')?.low_data).toBe(true)
  })

  it('is idempotent — a double run yields an identical row', async () => {
    const chest = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    for (const daysAgo of [2, 5, 9, 16, 23]) {
      await seedSession(prisma, userId, chest, { daysAgo, sets: chestSets(4) })
    }

    const first = await recomputeUserAggregates(prisma, userId, NOW)
    const rowA = await prisma.userTrainingAggregates.findUnique({ where: { userId } })
    const second = await recomputeUserAggregates(prisma, userId, NOW)
    const rowB = await prisma.userTrainingAggregates.findUnique({ where: { userId } })

    expect(second).toEqual(first)
    expect(rowB).toEqual(rowA)
  })

  it('flags low_data on the session/set boundary', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })

    // Exactly 3 sessions, exactly 20 effective sets in 14d -> NOT low_data.
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 9, sets: chestSets(6) })

    const ok = await recomputeUserAggregates(prisma, userId, NOW)
    expect(ok.perFau.find((f) => f.fau === 'chest')?.low_data).toBe(false)
  })

  it('flags low_data when under 20 effective sets in 14d', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    // 3 sessions but only 19 sets -> low_data.
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(6) })
    await seedSession(prisma, userId, chest, { daysAgo: 9, sets: chestSets(6) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.perFau.find((f) => f.fau === 'chest')?.low_data).toBe(true)
  })

  it('flags low_data when fewer than 3 sessions in 14d', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    // 2 sessions, plenty of sets -> still low_data (session floor).
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(15) })
    await seedSession(prisma, userId, chest, { daysAgo: 6, sets: chestSets(15) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.perFau.find((f) => f.fau === 'chest')?.low_data).toBe(true)
  })

  it('computes a deload acute:chronic ratio below 1', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    // 28d span established via an older session; last 7d is a light deload.
    await seedSession(prisma, userId, chest, { daysAgo: 3, sets: chestSets(4) }) // deload week
    await seedSession(prisma, userId, chest, { daysAgo: 10, sets: chestSets(10) })
    await seedSession(prisma, userId, chest, { daysAgo: 17, sets: chestSets(10) })
    await seedSession(prisma, userId, chest, { daysAgo: 24, sets: chestSets(10) })
    await seedSession(prisma, userId, chest, { daysAgo: 35, sets: chestSets(8) }) // >28d: sets first-session span

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    // sets7d = 4, sets28d = 4+10+10+10 = 34 -> 4 / (34/4) = 0.47
    expect(agg.acuteChronicRatio).toBeCloseTo(4 / (34 / 4), 2)
    expect(agg.acuteChronicRatio!).toBeLessThan(1)
  })

  it('returns null ACR until a 28-day span with >= 20 sets exists', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    // Only ~2 weeks of history, first session < 28d ago.
    await seedSession(prisma, userId, chest, { daysAgo: 3, sets: chestSets(10) })
    await seedSession(prisma, userId, chest, { daysAgo: 10, sets: chestSets(10) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.acuteChronicRatio).toBeNull()
  })

  it('populates detraining_gap after an 11-day gap with prior training', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    for (const daysAgo of [11, 15, 20]) {
      await seedSession(prisma, userId, chest, { daysAgo, sets: chestSets(5) })
    }

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.daysSinceAnySession).toBe(11)
    expect(agg.sessionsLast7d).toBe(0)
    expect(agg.detrainingGapDays).toBe(11)
  })

  it('leaves detraining_gap null with fewer than 3 prior sessions', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    await seedSession(prisma, userId, chest, { daysAgo: 11, sets: chestSets(5) })
    await seedSession(prisma, userId, chest, { daysAgo: 15, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.daysSinceAnySession).toBe(11)
    expect(agg.detrainingGapDays).toBeNull()
  })

  it('leaves detraining_gap null when the most recent session is within 10 days', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    for (const daysAgo of [3, 8, 14]) {
      await seedSession(prisma, userId, chest, { daysAgo, sets: chestSets(5) })
    }

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.detrainingGapDays).toBeNull()
  })

  it('aggregates effort on the RPE-equivalent scale for an RIR-logging user', async () => {
    const chest = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    // RIR-only user: rpe null, rir 2 -> effort 8 on the RPE-equivalent scale.
    for (const daysAgo of [3, 7, 12, 20]) {
      await seedSession(prisma, userId, chest, {
        daysAgo,
        sets: [{ weight: 185, reps: 5, rpe: null, rir: 2 }],
      })
    }

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    const cal = agg.perMovementCalibration.find((c) => c.movement_pattern === 'horizontal_push')
    expect(cal).toBeDefined()
    expect(cal?.observation_count).toBe(4)
    expect(cal?.avg_effort_rpe_equiv).toBe(8)
  })

  it('excludes bodyweight weights from calibration but counts their FAU volume', async () => {
    const pushup = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
      isBodyweight: true,
    })
    // Bodyweight pushups logged with weight 0.
    for (const daysAgo of [2, 5, 9]) {
      await seedSession(prisma, userId, pushup, {
        daysAgo,
        sets: [{ weight: 0, reps: 15, rir: 2 }],
      })
    }

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    // FAU volume counts the bodyweight sets.
    expect(agg.perFau.find((f) => f.fau === 'chest')?.rolling_14d_sets).toBe(3)
    // No calibration entry — bodyweight weights are excluded from EWMAs.
    expect(agg.perMovementCalibration).toEqual([])
  })

  it('computes a full established-user row across the spec fields', async () => {
    const chest = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    // One chest session per complete week for 8 weeks (5 sets each)...
    for (const daysAgo of [4, 11, 18, 25, 32, 39, 46, 53]) {
      await seedSession(prisma, userId, chest, { daysAgo, sets: chestSets(5) })
    }
    // ...plus a recent session (current partial week) and a 10th session to
    // cross the established threshold.
    await seedSession(prisma, userId, chest, { daysAgo: 1, sets: chestSets(6) })
    await seedSession(prisma, userId, chest, { daysAgo: 6, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)

    expect(agg.qualifyingSessionsTotal).toBe(10)
    expect(agg.dataMaturity).toBe('established')
    expect(agg.daysSinceAnySession).toBe(1)
    expect(agg.sessionsLast7d).toBe(3) // daysAgo 1, 4, 6
    // 8 complete weeks, current partial week excluded -> weekly median 5.
    expect(agg.totalWeeklySetsBaseline).toBe(5)

    const chestFau = agg.perFau.find((f) => f.fau === 'chest')
    expect(chestFau).toBeDefined()
    expect(chestFau?.low_data).toBe(false)
    expect(chestFau?.baseline_weekly_sets).toBe(5)
    expect(chestFau?.rolling_7d_sets).toBe(16) // 6 + 5 + 5
    expect(chestFau?.rolling_14d_sets).toBe(21) // + daysAgo 11

    const cal = agg.perMovementCalibration.find((c) => c.movement_pattern === 'horizontal_push')
    expect(cal).toBeDefined()
    expect(cal?.observation_count).toBe(6) // sessions within 30d
    expect(cal?.typical_rep_range).toBe('5')
    expect(cal?.avg_effort_rpe_equiv).toBe(8)
    expect(cal?.estimate_staleness_days).toBe(1)
    expect(cal?.recent_observations).toHaveLength(5)
    // e1RM(185, 5) = 215.8; gap-decayed EWMA sits near it.
    expect(cal?.ewma_e1rm_lbs).toBeGreaterThan(200)
    expect(cal?.ewma_e1rm_lbs).toBeLessThan(230)
    // oldest -> newest ordering.
    const daysAgoSeries = cal!.recent_observations.map((o) => o.days_ago)
    expect(daysAgoSeries).toEqual([...daysAgoSeries].sort((a, b) => b - a))
  })

  // -------------------------------------------------------------------------
  // per_fau shares + status (#941)
  // -------------------------------------------------------------------------

  it('emits zero-sum shares that normalize across present FAUs', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    const lats = await createDef(prisma, { primaryFAUs: ['lats'] })
    // 3 sessions, 20 effective sets in 14d -> not low_data. chest 15, lats 5.
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(8) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(7) })
    await seedSession(prisma, userId, lats, { daysAgo: 9, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    const shares = agg.perFau

    // Shares are defined over present FAUs and each set sums to 1.
    const targetSum = shares.reduce((s, f) => s + f.target_share, 0)
    const actualSum = shares.reduce((s, f) => s + f.actual_14d_share, 0)
    const deficitSum = shares.reduce((s, f) => s + f.deficit_share, 0)
    expect(targetSum).toBeCloseTo(1, 3)
    expect(actualSum).toBeCloseTo(1, 3)
    expect(deficitSum).toBeCloseTo(0, 3)

    // Default preset (uniform weight 1.0) -> equal target shares.
    const chestFau = shares.find((f) => f.fau === 'chest')!
    const latsFau = shares.find((f) => f.fau === 'lats')!
    expect(chestFau.target_share).toBeCloseTo(0.5, 4)
    expect(latsFau.target_share).toBeCloseTo(0.5, 4)
    // 15 / 20 vs 5 / 20 effective sets in 14d.
    expect(chestFau.actual_14d_share).toBeCloseTo(0.75, 4)
    expect(latsFau.actual_14d_share).toBeCloseTo(0.25, 4)
    // deficit = target - actual: chest over-trained, lats neglected.
    expect(chestFau.deficit_share).toBeCloseTo(-0.25, 4)
    expect(latsFau.deficit_share).toBeCloseTo(0.25, 4)
  })

  it('honors ratioTargets weights when deriving target_share', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    const lats = await createDef(prisma, { primaryFAUs: ['lats'] })
    // Weight lats 3x chest -> target shares 0.25 / 0.75 over the two present FAUs.
    await seedProfile(prisma, userId, { ratioTargets: { chest: 1, lats: 3 } })
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(7) })
    await seedSession(prisma, userId, lats, { daysAgo: 9, sets: chestSets(6) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    const chestFau = agg.perFau.find((f) => f.fau === 'chest')!
    const latsFau = agg.perFau.find((f) => f.fau === 'lats')!
    expect(chestFau.target_share).toBeCloseTo(0.25, 4)
    expect(latsFau.target_share).toBeCloseTo(0.75, 4)
  })

  it('handles a zero-14d-volume present FAU (share 0, deficit = full target)', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    const lats = await createDef(prisma, { primaryFAUs: ['lats'] })
    // chest trained recently; lats only trained 30d ago (present in 8wk window,
    // but zero volume in the rolling 14d window).
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(8) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(7) })
    await seedSession(prisma, userId, chest, { daysAgo: 9, sets: chestSets(6) })
    await seedSession(prisma, userId, lats, { daysAgo: 30, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    const latsFau = agg.perFau.find((f) => f.fau === 'lats')
    expect(latsFau).toBeDefined()
    expect(latsFau?.rolling_14d_sets).toBe(0)
    expect(latsFau?.actual_14d_share).toBe(0)
    // target_share still defined (present FAU); deficit is the full target.
    expect(latsFau?.target_share).toBeGreaterThan(0)
    expect(latsFau?.deficit_share).toBeCloseTo(latsFau!.target_share, 4)
  })

  it('labels status neglected / over / balanced by the deadband', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    const lats = await createDef(prisma, { primaryFAUs: ['lats'] })
    // Skewed volume: chest over target, lats under. Deadband 0.03 default.
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(8) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(7) })
    await seedSession(prisma, userId, lats, { daysAgo: 9, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.perFau.find((f) => f.fau === 'chest')?.status).toBe('over')
    expect(agg.perFau.find((f) => f.fau === 'lats')?.status).toBe('neglected')
  })

  it('labels status balanced when actual matches target within the deadband', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    const lats = await createDef(prisma, { primaryFAUs: ['lats'] })
    // Equal volume across two default-weighted FAUs -> deficit ~0 -> balanced.
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(5) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(5) })
    await seedSession(prisma, userId, lats, { daysAgo: 6, sets: chestSets(5) })
    await seedSession(prisma, userId, lats, { daysAgo: 9, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.perFau.find((f) => f.fau === 'chest')?.status).toBe('balanced')
    expect(agg.perFau.find((f) => f.fau === 'lats')?.status).toBe('balanced')
  })

  it('omits status under low_data', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    // Only 2 sessions -> low_data -> status suppressed.
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(8) })
    await seedSession(prisma, userId, chest, { daysAgo: 5, sets: chestSets(8) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    const chestFau = agg.perFau.find((f) => f.fau === 'chest')
    expect(chestFau?.low_data).toBe(true)
    expect(chestFau?.status).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // per_fau last_heavy_days_ago (#941)
  // -------------------------------------------------------------------------

  it('computes last_heavy_days_ago via the EWMA branch', async () => {
    // Calibrated pattern (>= 3 obs in 30d). Low logged effort (rir 4 -> effort 6)
    // so the effort branch never fires — heaviness comes from the EWMA compare.
    const bench = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    for (const daysAgo of [3, 10, 17]) {
      await seedSession(prisma, userId, bench, {
        daysAgo,
        sets: [{ weight: 185, reps: 5, rpe: null, rir: 4 }],
      })
    }

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    // EWMA ~ e1RM(185,5); each session's top set >= 85% of it -> heavy.
    expect(agg.perMovementCalibration.find((c) => c.movement_pattern === 'horizontal_push')).toBeDefined()
    expect(agg.perFau.find((f) => f.fau === 'chest')?.last_heavy_days_ago).toBe(3)
  })

  it('computes last_heavy_days_ago via the intensityClass tag fallback (cold start)', async () => {
    // < 3 observations -> no EWMA; low effort (rir 4) -> effort branch silent;
    // intensityClass 'heavy' is the only signal that fires.
    const heavyLift = await createDef(prisma, {
      primaryFAUs: ['quads'],
      movementPattern: 'squat',
      intensityClass: 'heavy',
    })
    await seedSession(prisma, userId, heavyLift, {
      daysAgo: 4,
      sets: [{ weight: 225, reps: 5, rpe: null, rir: 4 }],
    })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    // No calibration entry (too few obs), but tag fallback marks it heavy.
    expect(agg.perMovementCalibration).toEqual([])
    expect(agg.perFau.find((f) => f.fau === 'quads')?.last_heavy_days_ago).toBe(4)
  })

  it('leaves last_heavy_days_ago null when no session was heavy', async () => {
    // Light intensityClass, low effort, no EWMA -> never heavy.
    const light = await createDef(prisma, {
      primaryFAUs: ['biceps'],
      movementPattern: 'elbow_flexion',
      intensityClass: 'light',
    })
    await seedSession(prisma, userId, light, {
      daysAgo: 4,
      sets: [{ weight: 30, reps: 12, rpe: null, rir: 4 }],
    })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    const biceps = agg.perFau.find((f) => f.fau === 'biceps')
    expect(biceps?.last_session_days_ago).toBe(4)
    expect(biceps?.last_heavy_days_ago).toBeNull()
  })

  // -------------------------------------------------------------------------
  // goal_progress (#941)
  // -------------------------------------------------------------------------

  it('classifies a progressing goal from a rising e1RM series', async () => {
    const bench = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    await seedProfile(prisma, userId, { goalSentences: ['Increase my bench press'] })
    // Rising top-set weights across 4 distinct weeks.
    await seedSession(prisma, userId, bench, { daysAgo: 22, sets: [{ weight: 135, reps: 5 }] })
    await seedSession(prisma, userId, bench, { daysAgo: 15, sets: [{ weight: 155, reps: 5 }] })
    await seedSession(prisma, userId, bench, { daysAgo: 8, sets: [{ weight: 175, reps: 5 }] })
    await seedSession(prisma, userId, bench, { daysAgo: 1, sets: [{ weight: 185, reps: 5 }] })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.goalProgress).toHaveLength(1)
    const goal = agg.goalProgress[0]
    expect(goal.goal).toBe('Increase my bench press')
    expect(goal.trend).toBe('progressing')
    expect(goal.weeks_observed).toBe(4)
    // Oldest -> newest top sets.
    expect(goal.recent_top_sets_lbs).toEqual([135, 155, 175, 185])
  })

  it('classifies a regressing goal from a falling e1RM series', async () => {
    const squat = await createDef(prisma, {
      primaryFAUs: ['quads'],
      movementPattern: 'squat',
    })
    await seedProfile(prisma, userId, { goalSentences: ['Get a bigger squat'] })
    await seedSession(prisma, userId, squat, { daysAgo: 22, sets: [{ weight: 275, reps: 5 }] })
    await seedSession(prisma, userId, squat, { daysAgo: 15, sets: [{ weight: 255, reps: 5 }] })
    await seedSession(prisma, userId, squat, { daysAgo: 8, sets: [{ weight: 235, reps: 5 }] })
    await seedSession(prisma, userId, squat, { daysAgo: 1, sets: [{ weight: 225, reps: 5 }] })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.goalProgress[0]?.trend).toBe('regressing')
  })

  it('classifies a stalled goal from a flat e1RM series', async () => {
    const bench = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    await seedProfile(prisma, userId, { goalSentences: ['Improve bench press'] })
    for (const daysAgo of [22, 15, 8, 1]) {
      await seedSession(prisma, userId, bench, { daysAgo, sets: [{ weight: 185, reps: 5 }] })
    }

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.goalProgress[0]?.trend).toBe('stalled')
  })

  it('classifies a cold-start goal as "new" with too few observed weeks', async () => {
    const squat = await createDef(prisma, {
      primaryFAUs: ['quads'],
      movementPattern: 'squat',
    })
    await seedProfile(prisma, userId, { goalSentences: ['Squat more weight'] })
    // Only one session -> a single observed week -> below goalProgressMinWeeks.
    await seedSession(prisma, userId, squat, { daysAgo: 2, sets: [{ weight: 225, reps: 5 }] })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.goalProgress[0]?.trend).toBe('new')
    expect(agg.goalProgress[0]?.weeks_observed).toBe(1)
  })

  it('omits uninterpretable goals and yields none when no goals are set', async () => {
    const bench = await createDef(prisma, {
      primaryFAUs: ['chest'],
      movementPattern: 'horizontal_push',
    })
    await seedProfile(prisma, userId, {
      goalSentences: ['Feel healthier and more energetic'],
    })
    await seedSession(prisma, userId, bench, { daysAgo: 2, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    // The goal maps to no movement pattern -> omitted entirely.
    expect(agg.goalProgress).toEqual([])
  })

  it('emits an empty goalProgress when the user has no profile', async () => {
    const chest = await createDef(prisma, { primaryFAUs: ['chest'] })
    await seedSession(prisma, userId, chest, { daysAgo: 2, sets: chestSets(5) })

    const agg = await recomputeUserAggregates(prisma, userId, NOW)
    expect(agg.goalProgress).toEqual([])

    // Persisted column round-trips as an empty array.
    const row = await prisma.userTrainingAggregates.findUnique({ where: { userId } })
    expect(row?.goalProgress).toEqual([])
  })
})
