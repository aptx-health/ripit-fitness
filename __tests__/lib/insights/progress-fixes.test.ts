/**
 * Progress S1 fixes from review 109 (work item 110), the DB loader. Real test DB.
 * Spec: features/analytics/weekly-report.feature ("Normal only counts weeks
 * since the first workout", "Streak").
 *
 *   - The normal averages only the prior weeks (up to 8) that start on or after
 *     the week of the user's first counted workout; gaps after it count as 0.
 *     `normalWeeks` says how many weeks that is (0: nothing to compare with).
 *   - The streak runs back past the 8 weeks before the selected one, through a
 *     grouped per-week count in the user's zone that stops at the first miss.
 *
 * "Now" is Wednesday 2026-10-28 12:00 Denver; the selected week is 2026-10-26.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getWeeklyReport } from '@/lib/insights/progress'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const DEN = 'America/Denver'
const NOW = new Date('2026-10-28T18:00:00Z')
const THIS_WEEK = '2026-10-26'

let prisma: PrismaClient
let userId: string
let otherUserId: string
let defId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  defId = (await createTestExerciseDefinition(prisma, { name: 'Bench Press', primaryFAUs: ['chest'] })).id
})

const report = (o: { weekStart?: string; timeZone?: string } = {}) =>
  getWeeklyReport(prisma, userId, { weekStart: THIS_WEEK, timeZone: DEN, now: NOW, ...o })

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
/** The Monday `n` weeks before THIS_WEEK. */
const weeksBack = (n: number) => addDays(THIS_WEEK, -7 * n)

/** Local Denver wall-clock time as an instant (MDT before 2026-11-01, MST after). */
function at(day: string, time = '12:00'): Date {
  const offset = day >= '2026-11-01' || day < '2026-03-08' ? '-07:00' : '-06:00'
  return new Date(`${day}T${time}:00${offset}`)
}

async function seed(o: { at: Date; userId?: string; status?: string; archived?: boolean; sets?: number }) {
  const completion = await prisma.workoutCompletion.create({
    data: {
      userId: o.userId ?? userId,
      status: o.status ?? 'completed',
      completedAt: o.at,
      isArchived: o.archived ?? false,
      isAdHoc: true,
    },
  })
  if (o.sets) {
    const exercise = await prisma.exercise.create({
      data: { name: 'Bench Press', exerciseDefinitionId: defId, order: 1, userId: o.userId ?? userId, workoutCompletionId: completion.id, isOneOff: true },
    })
    await prisma.loggedSet.createMany({
      data: Array.from({ length: o.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: 5,
        weight: 100,
        weightUnit: 'lbs',
        exerciseId: exercise.id,
        completionId: completion.id,
        userId: o.userId ?? userId,
      })),
    })
  }
}
/** `n` workouts on the first days of a week, at 10:00 local. */
async function seedWeek(weekStart: string, n: number, sets = 0) {
  for (let i = 0; i < n; i++) await seed({ at: at(addDays(weekStart, i), '10:00'), sets })
}

// ---------------------------------------------------------------------------
describe('Normal only counts weeks since the first workout', () => {
  it('the first workout 3 weeks before the selected week: normal averages those 3 weeks, not 8', async () => {
    await seedWeek(weeksBack(3), 3, 10)
    await seedWeek(weeksBack(2), 3, 20)
    await seedWeek(weeksBack(1), 3, 30)
    await seedWeek(THIS_WEEK, 3, 40)
    const r = await report()
    expect(r.normalWeeks).toBe(3)
    expect(r.normal.workouts).toBeCloseTo(3, 5)
    expect(r.normal.workingSets).toBeCloseTo((30 + 60 + 90) / 3, 5)
  })

  it('a week after a gap still counts the gap weeks as 0', async () => {
    await seedWeek(weeksBack(3), 3, 20)
    // weeksBack(2) is empty
    await seedWeek(weeksBack(1), 3, 20)
    const r = await report()
    expect(r.normalWeeks).toBe(3)
    expect(r.normal.workouts).toBeCloseTo(2, 5)
    expect(r.normal.workingSets).toBeCloseTo(40, 5)
  })

  it('with no week before the selected one (first workout this week), there is no normal', async () => {
    await seedWeek(THIS_WEEK, 2, 10)
    const r = await report()
    expect(r.normalWeeks).toBe(0)
    expect(r.normal).toMatchObject({ workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, avgRpe: null })
  })

  it('a brand-new user with no workouts has no normal', async () => {
    expect((await report()).normalWeeks).toBe(0)
  })

  it('a first workout long before the 8 weeks: all 8 count, quiet ones as 0', async () => {
    await seedWeek(weeksBack(30), 1)
    await seedWeek(weeksBack(1), 4)
    const r = await report()
    expect(r.normalWeeks).toBe(8)
    expect(r.normal.workouts).toBeCloseTo(4 / 8, 5)
  })

  it('looking back at an earlier week uses the weeks before that one', async () => {
    await seedWeek(weeksBack(4), 2)
    await seedWeek(weeksBack(2), 4)
    const r = await report({ weekStart: weeksBack(2) })
    expect(r.normalWeeks).toBe(2) // weeksBack(4) and weeksBack(3)
    expect(r.normal.workouts).toBeCloseTo(1, 5)
  })

  it('archived, draft and other users\' earlier workouts do not move the first week', async () => {
    await seed({ at: at(weeksBack(6)), archived: true })
    await seed({ at: at(weeksBack(6)), status: 'draft' })
    await seed({ at: at(weeksBack(6)), userId: otherUserId })
    await seedWeek(weeksBack(2), 2)
    const r = await report()
    expect(r.normalWeeks).toBe(2)
    expect(r.normal.workouts).toBeCloseTo(1, 5)
  })

  it('the first week is the local week: Sunday 21:00 Denver belongs to the week before', async () => {
    // Sunday before weeksBack(2), 21:00 MDT = Monday 03:00 UTC of weeksBack(2).
    await seed({ at: at(addDays(weeksBack(2), -1), '21:00') })
    expect((await report()).normalWeeks).toBe(3)
    expect((await report({ timeZone: 'UTC' })).normalWeeks).toBe(2)
  })
})

// ---------------------------------------------------------------------------
describe('Streak over more than 8 weeks', () => {
  it('10 full weeks plus this week gives 11', async () => {
    for (let n = 1; n <= 10; n++) await seedWeek(weeksBack(n), 3)
    await seedWeek(THIS_WEEK, 3)
    expect((await report()).streak).toBe(11)
  })

  it('one missed week 10 weeks back gives 9, whatever came before it', async () => {
    for (const n of [11, 12, 13]) await seedWeek(weeksBack(n), 3)
    await seedWeek(weeksBack(10), 1)
    for (let n = 1; n <= 9; n++) await seedWeek(weeksBack(n), 3)
    await seedWeek(THIS_WEEK, 1) // this week is still short: it neither adds nor breaks
    expect((await report()).streak).toBe(9)
  })

  it('an empty week 10 weeks back ends it too', async () => {
    for (const n of [11, 12]) await seedWeek(weeksBack(n), 3)
    for (let n = 1; n <= 9; n++) await seedWeek(weeksBack(n), 3)
    expect((await report()).streak).toBe(9)
  })

  it('the older weeks use the target from Settings', async () => {
    for (let n = 1; n <= 12; n++) await seedWeek(weeksBack(n), n <= 8 ? 4 : 3)
    await prisma.userSettings.create({ data: { userId, weeklyWorkoutTarget: 4 } })
    expect((await report()).streak).toBe(8) // weeks 9-12 had 3, under the target of 4
  })

  it('the older weeks are counted in the user\'s zone', async () => {
    for (let n = 1; n <= 9; n++) await seedWeek(weeksBack(n), 3)
    // weeksBack(10): two on Monday and Tuesday, the third on Sunday 21:00 Denver,
    // which is already Monday of weeksBack(9) in UTC.
    await seed({ at: at(weeksBack(10), '10:00') })
    await seed({ at: at(addDays(weeksBack(10), 1), '10:00') })
    await seed({ at: at(addDays(weeksBack(10), 6), '21:00') })
    expect((await report()).streak).toBe(10)
    expect((await report({ timeZone: 'UTC' })).streak).toBe(9)
  })

  it('archived, draft and other users\' workouts do not extend it', async () => {
    for (let n = 1; n <= 9; n++) await seedWeek(weeksBack(n), 3)
    for (let i = 0; i < 3; i++) {
      const when = at(addDays(weeksBack(10), i))
      await seed({ at: when, archived: true })
      await seed({ at: when, status: 'draft' })
      await seed({ at: when, userId: otherUserId })
    }
    expect((await report()).streak).toBe(9)
  })

  it('a past selected week counts back from itself', async () => {
    for (let n = 3; n <= 14; n++) await seedWeek(weeksBack(n), 3)
    expect((await report({ weekStart: weeksBack(3) })).streak).toBe(12)
  })
})
