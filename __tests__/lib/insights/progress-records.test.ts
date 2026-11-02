/**
 * Progress S2: the pure maths for Records, Lifts and the trend note (work item 111).
 * Spec: features/analytics/weekly-records.feature.
 *
 * Pinned interface (`@/lib/insights/progress-records`; nothing here touches the DB):
 *
 *   HistorySet = { completionId: string; completedAt: Date; exerciseDefinitionId: string; name: string;
 *                  reps: number; weight: number; weightUnit: string /* 'lbs' | 'kg' *\/; isWarmup: boolean }
 *     One logged set of the user's completed, un-archived workouts. Sets that share a
 *     completionId are one session. Bodyweight sets have weight 0. The history is not
 *     sorted and may run past the week asked for.
 *
 *   computeWeekRecords(history, weekStart: Date, weekEnd: Date, unit: 'lbs' | 'kg' = 'lbs'): WeekRecord[]
 *   computeWeekLifts(history, weekStart: Date, weekEnd: Date, unit = 'lbs'): WeekLift[]
 *     The week is [weekStart, weekEnd) as instants. Only history before weekStart is "previous";
 *     history from weekEnd on is ignored. Warm-up sets count nowhere. e1RM is Epley on the
 *     weight in lbs (weight x (1 + reps / 30), the weight itself at 1 rep); kg is x 2.20462.
 *     Every weight and e1RM that comes out is in `unit`. Numbers are raw (not rounded).
 *
 *   WeekRecord = { exerciseDefinitionId; name; kind: 'e1rm' | 'rep'; weight; reps; e1rm: number | null; previous: number }
 *     At most one per exercise; e1RM wins over a rep PR. weight x reps is the set that set the record.
 *       'e1rm': the week's best e1RM beat every earlier one (strictly). `previous` = the earlier best e1RM.
 *       'rep' : a weighted set at 1 to 12 reps was heavier than the heaviest earlier set at the same
 *               rep count. `previous` = that earlier weight. A bodyweight set (weight 0) is a rep PR when
 *               its reps beat the most earlier bodyweight reps: weight 0, e1rm null, `previous` = those reps.
 *     An exercise with no earlier working set is never a record (its first session).
 *
 *   WeekLift = { exerciseDefinitionId; name; workingSets: number;
 *                bestSet: { weight; reps };            // the week's set with the highest e1RM (bodyweight: the most reps)
 *                e1rm: number | null;                  // of bestSet; null for bodyweight
 *                previousE1rm: number | null;          // best-set e1RM of the latest session before the week
 *                bestE1rm: number | null;              // the best session e1RM up to the end of the week, this week included
 *                sessionsBelowBest: number }           // sessions after the latest one that reached bestE1rm
 *     One per exercise with working sets in the week, most working sets first. A session is a
 *     completionId; its e1RM is its best working set. Sessions without one (bodyweight) are skipped.
 *     The page, not this module, decides what "Flat" is (3 or more).
 *
 *   computeTrendNote(weeks: WeekStats[], normalWeeks: WeekStats[]): TrendNote | null
 *     weeks       the 8 chart weeks, oldest first, the shown week last (S1's `report.weeks`).
 *     normalWeeks the weeks S1's normal averages (the prior weeks since the first workout; the
 *                 value S1 hands to computeNormal). The first of them is the week of the first workout.
 *     TrendNote = { effortRisingWeeks: number; effortFrom: number | null; effortTo: number | null; lastLightWeeksAgo: number | null }
 *       null            fewer than 3 weeks of history: normalWeeks has 0 or 1 weeks (2 is not pinned).
 *       effortRisingWeeks  the number of weeks in the run of strictly rising average RPE that ends with the
 *                       shown week (4 weeks running, 8.0 -> 8.7 is four weeks: 8.0, 8.2, 8.5, 8.7). Only 3 or
 *                       more counts, below that it is 0 with effortFrom and effortTo null. A week with no
 *                       effort (S1: fewer than half its sets rated) ends the run. effortFrom is the run's
 *                       first average, effortTo the shown week's.
 *       lastLightWeeksAgo  0 for the shown week, 1 for the week before..., the latest week whose working
 *                       sets are at or under 60% of the normal's working sets (the mean of normalWeeks);
 *                       null when none. Weeks before the first workout's week never count.
 */

import { describe, expect, it } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

type Set = {
  completionId: string
  completedAt: Date
  exerciseDefinitionId: string
  name: string
  reps: number
  weight: number
  weightUnit: string
  isWarmup: boolean
}
type Rec = { exerciseDefinitionId: string; name: string; kind: 'e1rm' | 'rep'; weight: number; reps: number; e1rm: number | null; previous: number }
type Lift = {
  exerciseDefinitionId: string
  name: string
  workingSets: number
  bestSet: { weight: number; reps: number }
  e1rm: number | null
  previousE1rm: number | null
  bestE1rm: number | null
  sessionsBelowBest: number
}
type Stats = {
  weekStart: string
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  effort: { avgRpe: number; pctAtOrAbove9: number; setsAt10: number; ratedSets: number } | null
}
type Trend = { effortRisingWeeks: number; effortFrom: number | null; effortTo: number | null; lastLightWeeksAgo: number | null }
type Unit = 'lbs' | 'kg'
type Mod = {
  computeWeekRecords: (h: Set[], start: Date, end: Date, unit?: Unit) => Rec[]
  computeWeekLifts: (h: Set[], start: Date, end: Date, unit?: Unit) => Lift[]
  computeTrendNote: (weeks: Stats[], normalWeeks: Stats[]) => Trend | null
}
const mod = () => load('@/lib/insights/progress-records') as Promise<Mod>
const records = async (h: Set[], unit?: Unit, start = WEEK_START, end = WEEK_END) => (await mod()).computeWeekRecords(h, start, end, unit)
const lifts = async (h: Set[], unit?: Unit, start = WEEK_START, end = WEEK_END) => (await mod()).computeWeekLifts(h, start, end, unit)

const WEEK_START = new Date('2026-10-26T00:00:00Z')
const WEEK_END = new Date('2026-11-02T00:00:00Z')

const NAMES: Record<string, string> = {
  squat: 'Back Squat',
  bench: 'Bench Press',
  ohp: 'Overhead Press',
  pullup: 'Pull-up',
  hack: 'Hack Squat',
  row: 'Barbell Row',
}
const KG = 2.20462
const epley = (weightLbs: number, reps: number) => (reps === 1 ? weightLbs : weightLbs * (1 + reps / 30))
const approx = (actual: number | null | undefined, expected: number) => expect(actual as number).toBeCloseTo(expected, 1)

/** One set. `when` is a UTC instant; sets with the same exercise and `when` are one session unless `session` says otherwise. */
function set(ex: string, when: string, reps: number, weight: number, o: { unit?: string; warmup?: boolean; session?: string } = {}): Set {
  return {
    completionId: o.session ?? `${ex}@${when}`,
    completedAt: new Date(when),
    exerciseDefinitionId: ex,
    name: NAMES[ex] ?? ex,
    reps,
    weight,
    weightUnit: o.unit ?? 'lbs',
    isWarmup: o.warmup ?? false,
  }
}
// Days before and in the week (Mon 2026-10-26 .. Sun 2026-11-01).
const SEP10 = '2026-09-10T12:00:00Z'
const SEP24 = '2026-09-24T12:00:00Z'
const OCT12 = '2026-10-12T12:00:00Z'
const OCT20 = '2026-10-20T12:00:00Z'
const MON = '2026-10-26T12:00:00Z'
const WED = '2026-10-28T12:00:00Z'
const THU = '2026-10-29T12:00:00Z'
const NEXT_WEEK = '2026-11-03T12:00:00Z'

const one = <T,>(rows: T[]): T => {
  expect(rows).toHaveLength(1)
  return rows[0]
}

// ============================================================ Records ===============================
describe('Records: e1RM PR', () => {
  it('e1RM PR: the week\'s best e1RM beats the best before it, which can be any earlier session', async () => {
    const r = one(
      await records([
        set('squat', SEP10, 4, 260), // 294.67, the best before the week
        set('squat', OCT12, 4, 240), // 272, the latest, but not the best
        set('squat', WED, 4, 275), // 311.67
      ]),
    )
    expect(r).toMatchObject({ exerciseDefinitionId: 'squat', name: 'Back Squat', kind: 'e1rm', weight: 275, reps: 4 })
    approx(r.e1rm, epley(275, 4))
    approx(r.previous, epley(260, 4))
  })

  it('the record is the week\'s best-e1RM set, not the heaviest or the first one', async () => {
    const r = one(
      await records([
        set('squat', OCT12, 5, 250), // 291.67
        set('squat', MON, 5, 270), // 315
        set('squat', MON, 3, 280), // 308 (heavier, lower e1RM)
        set('squat', THU, 8, 260), // 329.33  <- best
      ]),
    )
    expect(r).toMatchObject({ kind: 'e1rm', weight: 260, reps: 8 })
    approx(r.e1rm, epley(260, 8))
  })

  it('a single rep is its own e1RM', async () => {
    const r = one(await records([set('squat', OCT12, 3, 250), set('squat', WED, 1, 340)]))
    expect(r).toMatchObject({ kind: 'e1rm', weight: 340, reps: 1 })
    approx(r.e1rm, 340)
    approx(r.previous, epley(250, 3))
  })

  it('a tie is not a PR: the same e1RM as before, or lower, is nothing', async () => {
    expect(await records([set('squat', OCT12, 4, 275), set('squat', WED, 4, 275)])).toEqual([])
    expect(await records([set('squat', OCT12, 4, 275), set('squat', WED, 4, 270)])).toEqual([])
  })

  it('the week\'s best across several sessions is the one compared', async () => {
    const r = one(await records([set('squat', OCT12, 4, 250), set('squat', MON, 4, 255), set('squat', THU, 4, 265)]))
    expect(r).toMatchObject({ weight: 265, reps: 4, kind: 'e1rm' })
  })
})

describe('Records: rep PR', () => {
  it('Rep PR: a heavier set at a rep count that is not an e1RM PR, compared with the heaviest earlier set at the same reps', async () => {
    const r = one(
      await records([
        set('bench', SEP10, 5, 225), // 262.5, so no e1RM PR is possible
        set('bench', SEP10, 8, 170),
        set('bench', OCT12, 8, 180), // the heaviest 8-rep set before the week
        set('bench', WED, 8, 185), // 234.33
      ]),
    )
    expect(r).toMatchObject({ exerciseDefinitionId: 'bench', name: 'Bench Press', kind: 'rep', weight: 185, reps: 8 })
    expect(r.previous).toBe(180)
    approx(r.e1rm, epley(185, 8))
  })

  it('a tie, or a lighter set at the same reps, is not a Rep PR', async () => {
    const before = [set('bench', SEP10, 5, 225), set('bench', OCT12, 8, 180)]
    expect(await records([...before, set('bench', WED, 8, 180)])).toEqual([])
    expect(await records([...before, set('bench', WED, 8, 175)])).toEqual([])
  })

  it('only the same rep count is compared: 185 x 8 against a heavier earlier 6-rep set is still a PR at 8', async () => {
    const r = one(
      await records([
        set('bench', SEP10, 5, 225),
        set('bench', SEP10, 6, 200), // heavier than 185, but not 8 reps
        set('bench', OCT12, 8, 180),
        set('bench', WED, 8, 185),
      ]),
    )
    expect(r).toMatchObject({ kind: 'rep', reps: 8, weight: 185, previous: 180 })
  })

  it('Rep PRs count heavier sets at 1 to 12 reps only: 12 is in, 13 and 15 are out', async () => {
    const base = [set('bench', SEP10, 5, 225)]
    const twelve = one(await records([...base, set('bench', OCT12, 12, 100), set('bench', WED, 12, 105)]))
    expect(twelve).toMatchObject({ kind: 'rep', reps: 12, weight: 105, previous: 100 })
    expect(await records([...base, set('bench', OCT12, 13, 100), set('bench', WED, 13, 105)])).toEqual([])
    expect(await records([...base, set('bench', OCT12, 15, 90), set('bench', WED, 15, 95)])).toEqual([])
  })

  it('Rep PRs count heavier sets at 1 to 12 reps only: a new 15-rep set with no earlier 15-rep set is not listed', async () => {
    expect(await records([set('bench', OCT12, 5, 200), set('bench', WED, 15, 95)])).toEqual([])
  })

  it('a heavier single is a Rep PR when it is not an e1RM PR', async () => {
    const r = one(
      await records([
        set('bench', SEP10, 3, 300), // 330
        set('bench', OCT12, 1, 270),
        set('bench', WED, 1, 280),
      ]),
    )
    expect(r).toMatchObject({ kind: 'rep', reps: 1, weight: 280, previous: 270 })
  })
})

describe('Records: precedence and one row per exercise', () => {
  it('One row per exercise: an e1RM PR and a Rep PR in the same week is one e1rm row', async () => {
    const r = one(
      await records([
        set('squat', SEP10, 5, 250), // 291.67
        set('squat', OCT12, 8, 200), // heaviest 8 before the week
        set('squat', MON, 4, 275), // e1RM PR (311.67)
        set('squat', THU, 8, 205), // also a Rep PR at 8 (259.67)
      ]),
    )
    expect(r).toMatchObject({ kind: 'e1rm', weight: 275, reps: 4 })
  })

  it('exercises are judged on their own history', async () => {
    const rows = await records([
      set('squat', OCT12, 4, 250),
      set('bench', OCT12, 5, 185),
      set('ohp', OCT12, 5, 100),
      set('squat', WED, 4, 255), // PR
      set('bench', WED, 5, 190), // PR
      set('ohp', WED, 5, 95), // lower
      set('row', WED, 8, 135), // first ever
    ])
    expect(rows.map((r) => r.exerciseDefinitionId).sort()).toEqual(['bench', 'squat'])
  })
})

describe('Records: first session, past weeks and edges', () => {
  it('An exercise\'s first ever session is not a PR', async () => {
    expect(await records([set('hack', WED, 8, 225), set('hack', WED, 8, 235)])).toEqual([])
  })

  it('first ever, even when it spans two sessions in the same week: only history before the week is "previous"', async () => {
    expect(await records([set('hack', MON, 8, 200), set('hack', THU, 8, 245)])).toEqual([])
  })

  it('an exercise with no history and no sets this week gives nothing; so does an empty history', async () => {
    expect(await records([])).toEqual([])
    expect(await records([set('squat', OCT12, 4, 250)])).toEqual([])
  })

  it('Past weeks show the records set in that week: later sets are ignored, earlier weeks are the only comparison', async () => {
    const h = [
      set('squat', OCT12, 4, 250), // before both weeks
      set('squat', OCT20, 4, 275), // the earlier week (Oct 19-25): a PR
      set('squat', WED, 4, 300), // the shown week (Oct 26-Nov 1): a PR against the earlier week's 275
      set('squat', NEXT_WEEK, 4, 350), // after both: never relevant
    ]
    const earlier = one(await records(h, 'lbs', new Date('2026-10-19T00:00:00Z'), WEEK_START))
    expect(earlier).toMatchObject({ kind: 'e1rm', weight: 275, reps: 4 })
    approx(earlier.previous, epley(250, 4))
    const shown = one(await records(h))
    expect(shown).toMatchObject({ kind: 'e1rm', weight: 300, reps: 4 })
    approx(shown.previous, epley(275, 4))
  })

  it('a set exactly at the start of the week is in it; one exactly at its end is not, and not previous either', async () => {
    const atStart = one(await records([set('squat', OCT12, 4, 250), set('squat', '2026-10-26T00:00:00Z', 4, 260)]))
    expect(atStart).toMatchObject({ kind: 'e1rm', weight: 260 })
    expect(await records([set('squat', OCT12, 4, 250), set('squat', '2026-11-02T00:00:00Z', 4, 260)])).toEqual([])
    const justBefore = await records([set('squat', '2026-10-25T23:59:59Z', 4, 260), set('squat', WED, 4, 255)])
    expect(justBefore).toEqual([]) // 260 was already done the second before the week
  })
})

describe('Records: bodyweight', () => {
  it('Bodyweight rep PR: more reps than the best before, with no e1RM', async () => {
    const r = one(await records([set('pullup', SEP10, 8, 0), set('pullup', OCT12, 10, 0), set('pullup', WED, 12, 0)]))
    expect(r).toMatchObject({ exerciseDefinitionId: 'pullup', name: 'Pull-up', kind: 'rep', weight: 0, reps: 12, previous: 10 })
    expect(r.e1rm).toBeNull()
  })

  it('equal reps, or fewer, at bodyweight is not a PR', async () => {
    expect(await records([set('pullup', OCT12, 10, 0), set('pullup', WED, 10, 0)])).toEqual([])
    expect(await records([set('pullup', OCT12, 10, 0), set('pullup', WED, 8, 0)])).toEqual([])
  })

  it('the first bodyweight session is not a PR', async () => {
    expect(await records([set('pullup', WED, 12, 0)])).toEqual([])
  })

  it('the best set of the week counts, over several bodyweight sets', async () => {
    const r = one(await records([set('pullup', OCT12, 10, 0), set('pullup', WED, 7, 0), set('pullup', WED, 11, 0), set('pullup', WED, 9, 0)]))
    expect(r).toMatchObject({ reps: 11, previous: 10 })
  })
})

describe('Records: warm-ups', () => {
  it('a warm-up this week is not a record, even when it is heavier than everything', async () => {
    const rows = await records([
      set('squat', OCT12, 5, 250), // 291.67
      set('squat', WED, 1, 400, { warmup: true }),
      set('squat', WED, 5, 200),
    ])
    expect(rows).toEqual([])
  })

  it('a warm-up before the week is not the best to beat', async () => {
    const r = one(
      await records([
        set('squat', OCT12, 5, 200), // 233.33
        set('squat', OCT12, 1, 400, { warmup: true }),
        set('squat', WED, 5, 210), // 245
      ]),
    )
    expect(r).toMatchObject({ kind: 'e1rm', weight: 210 })
    approx(r.previous, epley(200, 5))
  })

  it('an exercise with only warm-ups before the week is still on its first session', async () => {
    expect(await records([set('squat', OCT12, 5, 135, { warmup: true }), set('squat', WED, 5, 185)])).toEqual([])
  })
})

describe('Records: kilos and pounds', () => {
  const lbPrior = [set('squat', OCT12, 5, 100)] // 116.67 lb
  const kgWeek = [set('squat', WED, 5, 60, { unit: 'kg' })] // 132.28 lb x 1.1667 = 154.32 lb

  it('a kg set beats a lb set in the same measure: 60 kg x 5 is more than 100 lb x 5', async () => {
    const r = one(await records([...lbPrior, ...kgWeek], 'lbs'))
    expect(r).toMatchObject({ kind: 'e1rm', reps: 5 })
    approx(r.weight, 60 * KG)
    approx(r.e1rm, epley(60 * KG, 5))
    approx(r.previous, epley(100, 5))
  })

  it('shown in the user\'s unit: the same record for a kg user is in kg', async () => {
    const r = one(await records([...lbPrior, ...kgWeek], 'kg'))
    approx(r.weight, 60)
    approx(r.e1rm, 70) // 60 x (1 + 5/30)
    approx(r.previous, epley(100, 5) / KG)
  })

  it('a lb set that is lighter in kilos than the kg set before is not a PR', async () => {
    // 120 lb is 54.4 kg; 60 kg was done before.
    expect(await records([set('squat', OCT12, 5, 60, { unit: 'kg' }), set('squat', WED, 5, 120)])).toEqual([])
  })

  it('a Rep PR compares the same rep count across units: 85 kg x 8 against 180 lb x 8', async () => {
    const h = [set('bench', SEP10, 5, 225), set('bench', OCT12, 8, 180), set('bench', WED, 8, 85, { unit: 'kg' })]
    const lb = one(await records(h, 'lbs'))
    expect(lb).toMatchObject({ kind: 'rep', reps: 8, previous: 180 })
    approx(lb.weight, 85 * KG)
    const kg = one(await records(h, 'kg'))
    expect(kg).toMatchObject({ kind: 'rep', reps: 8 })
    approx(kg.weight, 85)
    approx(kg.previous, 180 / KG)
  })

  it('the default unit is lbs', async () => {
    const r = one(await records([...lbPrior, ...kgWeek]))
    approx(r.weight, 60 * KG)
  })
})

// ============================================================ Lifts =================================
describe('Lifts: which exercises, in what order', () => {
  it('Lifts lists each exercise done this week, most working sets first, and leaves out the ones not done', async () => {
    const rows = await lifts([
      set('squat', OCT12, 5, 250), // not this week
      set('pullup', WED, 8, 0),
      set('pullup', WED, 8, 0),
      ...[1, 2, 3, 4, 5, 6].map(() => set('ohp', MON, 5, 100)),
      set('squat', THU, 5, 250),
      set('squat', THU, 5, 250),
      set('squat', THU, 5, 250),
      set('hack', NEXT_WEEK, 5, 250), // a later week
    ])
    expect(rows.map((r) => r.exerciseDefinitionId)).toEqual(['ohp', 'squat', 'pullup'])
    expect(rows.map((r) => r.workingSets)).toEqual([6, 3, 2])
    expect(rows.map((r) => r.name)).toEqual(['Overhead Press', 'Back Squat', 'Pull-up'])
  })

  it('working sets count the week\'s sets of every session and leave warm-ups out', async () => {
    const [row] = await lifts([
      set('squat', MON, 5, 135, { warmup: true }),
      set('squat', MON, 5, 225),
      set('squat', MON, 5, 225),
      set('squat', THU, 5, 225),
      set('squat', THU, 5, 135, { warmup: true }),
      set('squat', OCT20, 5, 225), // last week
    ])
    expect(row.workingSets).toBe(3)
  })

  it('nothing is listed for an empty week', async () => {
    expect(await lifts([])).toEqual([])
    expect(await lifts([set('squat', OCT12, 5, 250)])).toEqual([])
  })
})

describe('Lifts: the best set and the change', () => {
  it('the best set is the one with the highest e1RM, not the heaviest, and its e1RM comes with it', async () => {
    const row = one(
      await lifts([
        set('ohp', MON, 5, 115), // 134.17
        set('ohp', MON, 3, 120), // 132
        set('ohp', MON, 8, 110), // 139.33
        set('ohp', MON, 1, 200, { warmup: true }),
      ]),
    )
    expect(row.bestSet).toEqual({ weight: 110, reps: 8 })
    approx(row.e1rm, epley(110, 8))
  })

  it('the best set can come from a later session of the week', async () => {
    const row = one(await lifts([set('ohp', MON, 5, 100), set('ohp', THU, 5, 110)]))
    expect(row.bestSet).toEqual({ weight: 110, reps: 5 })
  })

  it('the change is against the previous session: the latest one before the week, not the best', async () => {
    const row = one(
      await lifts([
        set('ohp', SEP10, 5, 130), // the best, long ago
        set('ohp', OCT12, 5, 100), // the previous session
        set('ohp', WED, 5, 105),
      ]),
    )
    approx(row.previousE1rm, epley(100, 5))
    approx(row.e1rm, epley(105, 5))
  })

  it('a first session has no previous e1RM; its best is its own and nothing is below it', async () => {
    const row = one(await lifts([set('hack', WED, 8, 225)]))
    expect(row.previousE1rm).toBeNull()
    approx(row.bestE1rm, epley(225, 8))
    expect(row.sessionsBelowBest).toBe(0)
  })

  it('sets from other weeks are not in the best set', async () => {
    const row = one(await lifts([set('ohp', OCT20, 5, 200), set('ohp', WED, 5, 100)]))
    expect(row.bestSet).toEqual({ weight: 100, reps: 5 })
  })
})

describe('Lifts: the best ever and sessions below it', () => {
  // 100 x 10 is e1RM 133.33; 95 x 10 is 126.67; 90 x 10 is 120; 85 x 10 is 113.33.
  const best = set('ohp', SEP10, 10, 100)
  const below = (when: string, w: number) => set('ohp', when, 10, w)

  it('Flat lift: the 3rd session in a row below the best', async () => {
    const row = one(await lifts([best, below(SEP24, 95), below(OCT12, 90), below(WED, 85)]))
    approx(row.bestE1rm, epley(100, 10))
    expect(row.sessionsBelowBest).toBe(3)
  })

  it('Fewer than 3 sessions below the best: 2 is 2 (and 1 is 1)', async () => {
    expect(one(await lifts([best, below(OCT12, 90), below(WED, 85)])).sessionsBelowBest).toBe(2)
    expect(one(await lifts([best, below(WED, 85)])).sessionsBelowBest).toBe(1)
  })

  it('a longer slide counts every session: 5 below', async () => {
    const rows = await lifts([
      best,
      below('2026-09-17T12:00:00Z', 97),
      below(SEP24, 96),
      below('2026-10-01T12:00:00Z', 95),
      below(OCT12, 90),
      below(WED, 85),
    ])
    expect(one(rows).sessionsBelowBest).toBe(5)
  })

  it('the best itself, or a tie with it, is not "below": the count restarts', async () => {
    expect(one(await lifts([best, below(SEP24, 90), below(OCT12, 90), below(WED, 100)])).sessionsBelowBest).toBe(0)
    expect(one(await lifts([best, below(SEP24, 90), below(OCT12, 100), below(WED, 90)])).sessionsBelowBest).toBe(1)
  })

  it('a new best this week is 0 below, and is its own best', async () => {
    const row = one(await lifts([best, below(OCT12, 95), below(WED, 105)]))
    expect(row.sessionsBelowBest).toBe(0)
    approx(row.bestE1rm, epley(105, 10))
    approx(row.e1rm, epley(105, 10))
  })

  it('the best can sit in the middle: only the sessions after it count', async () => {
    const rows = await lifts([below(SEP10, 80), below(SEP24, 100), below(OCT12, 90), below(WED, 85)])
    expect(one(rows).sessionsBelowBest).toBe(2)
    approx(one(rows).bestE1rm, epley(100, 10))
  })

  it('two sessions in the shown week both count', async () => {
    const rows = await lifts([best, below(OCT12, 90), below(MON, 88), below(THU, 85)])
    expect(one(rows).sessionsBelowBest).toBe(3)
  })

  it('sets of one session (one completionId) are one session', async () => {
    const rows = await lifts([
      best,
      set('ohp', OCT12, 10, 90, { session: 's1' }),
      set('ohp', OCT12, 10, 85, { session: 's1' }),
      set('ohp', OCT12, 10, 80, { session: 's1' }),
      set('ohp', WED, 10, 85, { session: 's2' }),
    ])
    expect(one(rows).sessionsBelowBest).toBe(2)
  })

  it('a session\'s warm-ups do not make it better, and a warm-up-only session is not a session', async () => {
    const rows = await lifts([
      best,
      set('ohp', OCT12, 10, 90),
      set('ohp', OCT12, 1, 200, { warmup: true }),
      set('ohp', OCT20, 5, 200, { warmup: true }),
      set('ohp', WED, 10, 85),
    ])
    expect(one(rows).sessionsBelowBest).toBe(2)
  })

  it('later weeks are ignored: a better session after the week does not change it', async () => {
    const rows = await lifts([best, below(OCT12, 90), below(WED, 85), set('ohp', NEXT_WEEK, 10, 150)])
    expect(one(rows).sessionsBelowBest).toBe(2)
    approx(one(rows).bestE1rm, epley(100, 10))
  })

  it('the best is judged per exercise', async () => {
    const rows = await lifts([best, below(OCT12, 90), below(WED, 85), set('squat', SEP10, 5, 300), set('squat', WED, 5, 305)])
    expect(rows.find((r) => r.exerciseDefinitionId === 'ohp')?.sessionsBelowBest).toBe(2)
    expect(rows.find((r) => r.exerciseDefinitionId === 'squat')?.sessionsBelowBest).toBe(0)
  })
})

describe('Lifts: bodyweight and units', () => {
  it('a bodyweight lift has its most reps as the best set and no e1RM, previous or best', async () => {
    const row = one(await lifts([set('pullup', OCT12, 10, 0), set('pullup', WED, 8, 0), set('pullup', WED, 12, 0), set('pullup', WED, 9, 0)]))
    expect(row).toMatchObject({ exerciseDefinitionId: 'pullup', workingSets: 3, bestSet: { weight: 0, reps: 12 }, e1rm: null, previousE1rm: null, bestE1rm: null, sessionsBelowBest: 0 })
  })

  it('weights come out in the user\'s unit', async () => {
    const h = [set('ohp', OCT12, 5, 40, { unit: 'kg' }), set('ohp', WED, 5, 100)]
    const lb = one(await lifts(h, 'lbs'))
    approx(lb.bestSet.weight, 100)
    approx(lb.e1rm, epley(100, 5))
    approx(lb.previousE1rm, epley(40 * KG, 5))
    const kg = one(await lifts(h, 'kg'))
    approx(kg.bestSet.weight, 100 / KG)
    approx(kg.e1rm, epley(100, 5) / KG)
    approx(kg.previousE1rm, 40 * (1 + 5 / 30))
    approx(kg.bestE1rm, Math.max(epley(100, 5), epley(40 * KG, 5)) / KG)
  })

  it('sessions in different units are compared in one: 60 kg x 10 (176 lb e1RM) beats 100 lb x 10, so only the session after it is below', async () => {
    const rows = await lifts([set('ohp', SEP10, 10, 100), set('ohp', OCT12, 10, 60, { unit: 'kg' }), set('ohp', WED, 10, 85)])
    expect(one(rows).sessionsBelowBest).toBe(1)
    approx(one(rows).bestE1rm, epley(60 * KG, 10))
  })
})

// ============================================================ Trend note ============================
const addWeeks = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 7 * 86_400_000).toISOString().slice(0, 10)
const wk = (weekStart: string, workingSets: number, avgRpe: number | null = null): Stats => ({
  weekStart,
  workouts: workingSets > 0 ? 3 : 0,
  workingSets,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: avgRpe == null ? null : { avgRpe, pctAtOrAbove9: 0, setsAt10: 0, ratedSets: Math.max(1, workingSets) },
})
const FIRST = '2026-09-07'
/** The 8 chart weeks, oldest first, from sets and average RPEs (null: not tracked enough). */
const chart = (sets: number[], rpes: Array<number | null> = []): Stats[] => sets.map((n, i) => wk(addWeeks(FIRST, i), n, rpes[i] ?? null))
/** A normal of `n` weeks at 50 working sets, starting from the chart's week `from`. */
const normalOf = (n: number, from = 0, sets = 50): Stats[] => Array.from({ length: n }, (_, i) => wk(addWeeks(FIRST, from + i), sets))
const note = async (weeks: Stats[], normalWeeks: Stats[] = normalOf(7)) => (await mod()).computeTrendNote(weeks, normalWeeks)
const FLAT_SETS = [50, 50, 50, 50, 50, 50, 50, 50]

describe('Trend note: rising effort', () => {
  it('Rising effort: average RPE rose 4 weeks running, from 8.0 to 8.7', async () => {
    const t = await note(chart(FLAT_SETS, [8.1, 8.6, 8.9, 8.4, 8.0, 8.2, 8.5, 8.7]))
    expect(t?.effortRisingWeeks).toBe(4)
    approx(t?.effortFrom, 8.0)
    approx(t?.effortTo, 8.7)
  })

  it('exactly 3 weeks is enough', async () => {
    const t = await note(chart(FLAT_SETS, [8.0, 8.1, 8.2, 8.3, 8.0, 7.5, 7.8, 8.2]))
    expect(t?.effortRisingWeeks).toBe(3)
    approx(t?.effortFrom, 7.5)
    approx(t?.effortTo, 8.2)
  })

  it('the whole chart rising counts 8 weeks', async () => {
    const t = await note(chart(FLAT_SETS, [7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2, 8.4]))
    expect(t?.effortRisingWeeks).toBe(8)
    approx(t?.effortFrom, 7.0)
    approx(t?.effortTo, 8.4)
  })

  it('Rising effort needs at least 3 weeks: only 2 says nothing about effort', async () => {
    const t = await note(chart(FLAT_SETS, [8.2, 8.4, 8.6, 8.1, 8.0, 8.4, 8.1, 8.5]))
    expect(t).not.toBeNull()
    expect(t?.effortRisingWeeks).toBe(0)
    expect(t?.effortFrom ?? null).toBeNull()
    expect(t?.effortTo ?? null).toBeNull()
  })

  it('the run has to end with the shown week: a last week that fell is no run', async () => {
    const t = await note(chart(FLAT_SETS, [7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2, 8.0]))
    expect(t?.effortRisingWeeks).toBe(0)
  })

  it('a week at the same average does not extend the run', async () => {
    const t = await note(chart(FLAT_SETS, [7.0, 7.4, 7.9, 8.0, 8.0, 8.3, 8.6, 8.8]))
    expect(t?.effortRisingWeeks).toBe(4) // 8.0, 8.3, 8.6, 8.8; the 8.0 before is a tie, not a rise
    approx(t?.effortFrom, 8.0)
  })

  it('Little effort data: a week with no effort ends the run (it is not skipped over)', async () => {
    const t = await note(chart(FLAT_SETS, [8.0, 8.1, 8.2, 8.3, 8.0, null, 8.5, 8.7]))
    expect(t?.effortRisingWeeks).toBe(0) // only 2 weeks since the gap
    const gap = await note(chart(FLAT_SETS, [7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2, null]))
    expect(gap?.effortRisingWeeks).toBe(0) // the shown week has no effort
  })

  it('Little effort data: no week with effort says nothing about effort', async () => {
    const t = await note(chart(FLAT_SETS, [null, null, null, null, null, null, null, null]))
    expect(t).not.toBeNull()
    expect(t?.effortRisingWeeks).toBe(0)
    expect(t?.effortFrom ?? null).toBeNull()
  })
})

describe('Trend note: the last light week', () => {
  it('Last light week: 5 weeks ago', async () => {
    const t = await note(chart([50, 50, 30, 50, 50, 50, 50, 50]))
    expect(t?.lastLightWeeksAgo).toBe(5)
  })

  it('the boundary is 60% of normal: 30 of a normal of 50 is light, 31 is not', async () => {
    expect((await note(chart([50, 50, 30, 50, 50, 50, 50, 50])))?.lastLightWeeksAgo).toBe(5)
    expect((await note(chart([50, 50, 31, 50, 50, 50, 50, 50])))?.lastLightWeeksAgo).toBeNull()
  })

  it('a week with no sets at all is light', async () => {
    expect((await note(chart([50, 50, 50, 50, 0, 50, 50, 50])))?.lastLightWeeksAgo).toBe(3)
  })

  it('No light week in the 8 weeks: null', async () => {
    const t = await note(chart([40, 45, 52, 48, 50, 55, 60, 66]))
    expect(t).not.toBeNull()
    expect(t?.lastLightWeeksAgo).toBeNull()
  })

  it('the latest light week wins, and the week before the shown one is 1 ago', async () => {
    expect((await note(chart([50, 30, 50, 20, 50, 50, 50, 50])))?.lastLightWeeksAgo).toBe(4)
    expect((await note(chart([50, 50, 50, 50, 50, 50, 25, 50])))?.lastLightWeeksAgo).toBe(1)
  })

  it('the shown week itself can be the light one: 0 weeks ago', async () => {
    expect((await note(chart([50, 50, 50, 50, 50, 50, 50, 20])))?.lastLightWeeksAgo).toBe(0)
  })

  it('light is against the normal, not against the chart: a quiet chart under a normal of 100 is all light', async () => {
    const t = await note(chart([50, 50, 50, 50, 50, 50, 50, 50]), normalOf(7, 0, 100))
    expect(t?.lastLightWeeksAgo).toBe(0)
    const u = await note(chart([70, 70, 70, 70, 70, 70, 70, 70]), normalOf(7, 0, 100))
    expect(u?.lastLightWeeksAgo).toBeNull()
  })

  it('the normal is the mean of its weeks, not of the chart', async () => {
    // Normal weeks 40, 60, 50 -> 50. 30 is light, 31 is not.
    const normal = [wk('2026-09-07', 40), wk('2026-09-14', 60), wk('2026-09-21', 50)]
    expect((await note(chart([50, 50, 50, 50, 50, 50, 50, 30]), normal))?.lastLightWeeksAgo).toBe(0)
    expect((await note(chart([50, 50, 50, 50, 50, 50, 50, 31]), normal))?.lastLightWeeksAgo).toBeNull()
  })

  it('weeks before the first workout are not light weeks', async () => {
    // The first workout was in the chart's 4th week: the empty weeks before it are not "light".
    const weeks = chart([0, 0, 0, 50, 50, 50, 50, 50])
    expect((await note(weeks, normalOf(4, 3)))?.lastLightWeeksAgo).toBeNull()
    // A light week after it still is.
    expect((await note(chart([0, 0, 0, 50, 50, 20, 50, 50], []), normalOf(4, 3)))?.lastLightWeeksAgo).toBe(2)
  })
})

describe('Trend note: not enough history', () => {
  it('Not enough history: no normal weeks, or one, is no note', async () => {
    expect(await note(chart(FLAT_SETS), [])).toBeNull()
    expect(await note(chart([0, 0, 0, 0, 0, 0, 50, 50], [null, null, null, null, null, null, 8.0, 8.2]), normalOf(1, 6))).toBeNull()
  })

  it('3 or more weeks of normal is enough for a note', async () => {
    const t = await note(chart([0, 0, 0, 0, 50, 50, 50, 50]), normalOf(3, 4))
    expect(t).not.toBeNull()
    expect(t?.lastLightWeeksAgo).toBeNull()
  })

  it('a full chart with a full normal is a note', async () => {
    expect(await note(chart(FLAT_SETS), normalOf(8))).not.toBeNull()
  })
})
