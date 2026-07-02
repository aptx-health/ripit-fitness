import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { recomputeUserAggregates } from '@/lib/aggregates/recompute'
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
    },
  })
  return def.id
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
})
