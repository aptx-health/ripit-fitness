/**
 * Step definitions for features/workout-library/tidy-update.feature (work 229,
 * slice 4). The contract the tests pin is at the top of tidy-update.support.ts.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countQueries } from '@/lib/test/query-count'
import {
  archived,
  asPlanned,
  auth,
  barAction,
  box,
  bulk,
  button,
  byName,
  changed,
  checkedAmong,
  checkedCount,
  EIGHT,
  enterSelect,
  freestyle,
  freshState,
  idsOf,
  type Json,
  listRoute,
  nav,
  pushPlan,
  RAW_COLOUR,
  renderList,
  renderSummary,
  req,
  result,
  rollupOf,
  row,
  rowOf,
  s,
  search,
  seed,
  selectRows,
  sessionFrom,
  sorted,
  TAP,
  tagsOf,
  tap,
  tapFilter,
  tapRow,
  toolbar,
  untilDb,
  update,
} from './tidy-update.support'

const rl = vi.hoisted(() => ({ refuse: false, calls: [] as Array<{ key: string }> }))
const boom = vi.hoisted(() => ({ on: false }))
const log = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const real = (await db()).getPrismaClient()
  // boom.on makes every database call from app code fail (tests use the real client).
  const prisma = new Proxy(real, {
    get(target, key) {
      if (boom.on) throw new Error('database unavailable (test)')
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', async () => {
  const { auth } = await import('./tidy-update.support')
  return {
    getCurrentUser: async () =>
      auth.userId
        ? { user: { id: auth.userId, role: 'user', email: `${auth.userId}@x.test` }, error: null }
        : { user: null, error: null },
  }
})
vi.mock('@/lib/logger', () => {
  const l = { error: log.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/rate-limit', async () => {
  const refused = () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, key) => {
        if (key === 'then' || key === '__esModule') return undefined
        if (key === 'getClientIp') return () => '203.0.113.7'
        if (key === 'checkRateLimit')
          return async (_l: unknown, k: string) => {
            rl.calls.push({ key: String(k) })
            return rl.refuse ? refused() : null
          }
        if (key === 'checkRateLimitWithHeaders')
          return async (_l: unknown, k: string) => {
            rl.calls.push({ key: String(k) })
            return { response: rl.refuse ? refused() : null, headers: {} }
          }
        return {}
      },
    }
  )
})
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn(), flushEvents: vi.fn(async () => {}), identify: vi.fn() }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: null, isLoading: false, error: null, refetch: vi.fn(async () => {}), updateSettings: vi.fn() }),
}))
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  useDraftWorkout: () => ({ activeDraft: null, refreshDraft: vi.fn(async () => {}), setActiveDraft: vi.fn(), isLoading: false }),
  DraftWorkoutProvider: ({ children }: { children: unknown }) => children,
}))
vi.mock('next/navigation', async () => {
  const { nav } = await import('./tidy-update.support')
  const router = {
    push: (to: string) => nav.to.push(to),
    replace: (to: string) => nav.to.push(to),
    refresh: () => {},
    back: () => {},
    prefetch: () => {},
  }
  return {
    redirect: (to: string) => {
      throw new Error(`NEXT_REDIRECT ${to}`)
    },
    useRouter: () => router,
    usePathname: () => '/library',
    useSearchParams: () => new URLSearchParams('type=workouts'),
  }
})

const feature = await loadFeature('features/workout-library/tidy-update.feature')

const RECENT = ['Leg Day', 'Bench Blast', 'Squat Focus', 'Full Eight']
const ALL = ['Push A', ...RECENT, 'Old Pull', 'Squat Classic']
const three = () => idsOf('Leg Day', 'Bench Blast', 'Squat Focus')
const tagDialog = (n: number) => screen.findByRole('dialog', { name: new RegExp(`^tag ${n} workouts?$`, 'i') })
const bodyText = () => document.body.textContent ?? ''

/** Push A's stored fields that Update must keep. */
const KEPT = ['id', 'name', 'notes', 'tags', 'pinnedAt', 'origin', 'createdAt', 'archivedAt', 'dismissedAt', 'sourceCompletionId']
const plain = (x: unknown) => JSON.parse(JSON.stringify(x))

beforeEach(() => {
  rl.refuse = false
  rl.calls.length = 0
  boom.on = false
  log.error.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('I am signed in', async () => {
      await freshState()
    })
    And('I have saved workouts in Library → Workouts', async () => {
      expect(Object.keys(s.ids)).toEqual(expect.arrayContaining(ALL))
    })
  })

  // Select mode -----------------------------------------------------------------
  Scenario('Enter and leave select mode', ({ When, Then, And }) => {
    When('I tap "Select" on Library → Workouts', async () => {
      await freshState()
      await renderList()
      expect(box('Leg Day')).toBeNull()
      await enterSelect()
      for (const n of ['Push A', ...RECENT]) expect(box(n), `a checkbox for ${n}`).toBeTruthy()
    })
    Then('each row shows a checkbox and tapping a row toggles it instead of opening it', async () => {
      await freshState()
      await renderList()
      await enterSelect()
      await tapRow('Leg Day')
      expect(box('Leg Day')?.checked).toBe(true)
      // Nothing opened: no panel buttons for the row, no dialog, no navigation.
      const li = rowOf('Leg Day') as HTMLElement
      expect(within(li).queryByRole('button', { name: /^(start|archive|rename|delete)\b/i })).toBeNull()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(nav.to).toEqual([])
      await tapRow('Leg Day')
      expect(box('Leg Day')?.checked).toBe(false)
      await tap(box('Bench Blast'))
      expect(box('Bench Blast')?.checked).toBe(true)
    })
    And('a bar at the bottom shows how many are selected with Archive, Tag and Delete', async () => {
      await freshState()
      await renderList()
      await enterSelect()
      await tapRow('Leg Day')
      await tapRow('Push A')
      const bar = toolbar()
      expect(bar.textContent).toMatch(/\b2 selected/i)
      for (const b of ['Archive', 'Tag', 'Delete']) expect(within(bar).getByRole('button', { name: new RegExp(`^${b}$`, 'i') })).toBeTruthy()
      await tapRow('Push A')
      expect(toolbar().textContent).toMatch(/\b1 selected/i)
    })
    And('"Done" leaves select mode and clears the selection', async () => {
      await freshState()
      await renderList()
      await enterSelect()
      await tapRow('Leg Day')
      await tapRow('Bench Blast')
      await tap(button(/^done$/i), 'a Done button')
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
      expect(screen.queryByRole('toolbar', { name: /selected workouts/i })).toBeNull()
      // Rows open again, and the selection is gone when Select is tapped again.
      await enterSelect()
      expect(checkedCount()).toBe(0)
    })
  })

  Scenario('Select all that show', ({ Given, When, Then }) => {
    Given('a search or tag chip is active', async () => {
      await freshState()
      await renderList()
      await search('squat')
      expect(rowOf('Squat Focus')).toBeTruthy()
      expect(rowOf('Leg Day')).toBeUndefined()
    })
    When('I tap "Select all"', async () => {
      await freshState()
      await renderList()
      await search('squat')
      await enterSelect()
      await tap(button(/^select all$/i), 'a Select all button')
      expect(checkedAmong(ALL)).toEqual(['Squat Focus', 'Squat Classic'])
    })
    Then('only the workouts that show are selected', async () => {
      await freshState()
      // With a search: the matches, Older's included, and nothing else.
      await renderList()
      await search('squat')
      await enterSelect()
      await tap(button(/^select all$/i))
      expect(checkedCount()).toBe(2)
      expect(toolbar().textContent).toMatch(/\b2 selected/i)
      await barAction('Archive')
      await untilDb(async () => (await archived('Squat Focus')) && (await archived('Squat Classic')), 'matches archived')
      for (const n of ['Push A', 'Leg Day', 'Bench Blast', 'Full Eight', 'Old Pull']) expect(await archived(n), n).toBe(false)
      cleanup()

      // With a tag chip: only the workouts carrying it (Squat Focus is archived now).
      await renderList()
      await tapFilter('Legs')
      await enterSelect()
      await tap(button(/^select all$/i))
      expect(sorted(checkedAmong(ALL))).toEqual(['Full Eight', 'Leg Day'])
      expect(toolbar().textContent).toMatch(/\b2 selected/i)
    })
  })

  Scenario('Bulk archive', ({ Given, When, Then, And }) => {
    Given('I selected 3 workouts', async () => {
      await freshState()
      await renderList()
      await selectRows('Leg Day', 'Push A', 'Old Pull')
    })
    When('I tap "Archive"', async () => {
      await freshState()
      await renderList()
      await selectRows('Leg Day', 'Push A', 'Old Pull')
      await barAction('Archive')
      await untilDb(async () => (await archived('Old Pull')) && (await archived('Push A')) && (await archived('Leg Day')), 'all 3 archived')
    })
    Then('the 3 are archived and leave the list', async () => {
      await freshState()
      await renderList()
      await selectRows('Leg Day', 'Push A', 'Old Pull')
      await barAction('Archive')
      await waitFor(() => expect(['Leg Day', 'Push A', 'Old Pull'].filter((n) => rowOf(n))).toEqual([]))
      for (const n of ['Leg Day', 'Push A', 'Old Pull']) expect(await archived(n), n).toBe(true)
      expect((await byName('Push A'))[0].pinnedAt).toBeNull()
      for (const n of ['Bench Blast', 'Squat Focus', 'Full Eight', 'Squat Classic']) expect(await archived(n), n).toBe(false)
    })
    And('a toast offers "Undo", which restores all 3', async () => {
      await freshState()
      const pin = (await byName('Push A'))[0].pinnedAt
      await renderList()
      await selectRows('Leg Day', 'Push A', 'Old Pull')
      await barAction('Archive')
      await untilDb(async () => archived('Push A'), 'archived')
      await tap(await screen.findByRole('button', { name: /^undo\b/i }))
      await untilDb(
        async () => !(await archived('Leg Day')) && !(await archived('Push A')) && !(await archived('Old Pull')),
        'Undo restores all 3'
      )
      // As they were: Push A pinned again, at its old time.
      expect((await byName('Push A'))[0].pinnedAt).toEqual(pin)
      await waitFor(() => expect(rowOf('Leg Day')).toBeTruthy())
      expect(rowOf('Push A')).toBeTruthy()
    })
  })

  Scenario('Bulk tag', ({ Given, When, Then, And }) => {
    Given('I selected 3 workouts', async () => {
      await freshState()
      await renderList()
      await selectRows('Leg Day', 'Bench Blast', 'Full Eight')
    })
    When('I tap "Tag" and pick a tag (existing, starter, or typed)', async () => {
      await freshState()
      // A starter tag, from the dialog's chips.
      await renderList()
      await selectRows('Leg Day', 'Bench Blast', 'Squat Focus')
      await barAction('Tag')
      const dialog = await tagDialog(3)
      for (const t of ['Legs', 'Pull', 'Mobility', 'Quick', 'Full body']) expect(within(dialog).queryByRole('button', { name: t }), t).toBeTruthy()
      expect(within(dialog).getAllByRole('button', { name: 'Legs' })).toHaveLength(1)
      await tap(within(dialog).getByRole('button', { name: 'Core' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      await untilDb(async () => (await tagsOf('Bench Blast')).includes('Core'), 'starter tag added')
      cleanup()
      // A typed tag, tidied as in slice 2.
      await renderList()
      await selectRows('Bench Blast', 'Squat Focus')
      await barAction('Tag')
      const typed = await tagDialog(2)
      await act(async () => {
        fireEvent.change(within(typed).getByRole('textbox', { name: /new tag/i }), { target: { value: '  Hill   sprints ' } })
      })
      await tap(within(typed).getByRole('button', { name: /^add$/i }))
      await untilDb(async () => (await tagsOf('Squat Focus')).includes('Hill sprints'), 'typed tag added')
      expect(await tagsOf('Bench Blast')).toEqual(['Core', 'Hill sprints'])
    })
    Then('that tag is added to all 3, keeping their other tags', async () => {
      await freshState()
      await renderList()
      await selectRows('Leg Day', 'Bench Blast', 'Old Pull')
      await barAction('Tag')
      await tap(within(await tagDialog(3)).getByRole('button', { name: 'Push' }))
      await untilDb(async () => (await tagsOf('Old Pull')).includes('Push'), 'tagged')
      expect(await tagsOf('Leg Day')).toEqual(['Legs', 'Push'])
      expect(await tagsOf('Bench Blast')).toEqual(['Push'])
      expect(await tagsOf('Old Pull')).toEqual(['Pull', 'Push'])
      expect(await tagsOf('Squat Focus')).toEqual(['Legs'])
    })
    And('a workout already at 8 tags is skipped, and the toast says how many were skipped', async () => {
      await freshState()
      await renderList()
      await selectRows('Leg Day', 'Bench Blast', 'Full Eight')
      await barAction('Tag')
      await tap(within(await tagDialog(3)).getByRole('button', { name: 'Quick' }))
      await untilDb(async () => (await tagsOf('Bench Blast')).includes('Quick'), 'tagged')
      expect(await tagsOf('Leg Day')).toEqual(['Legs', 'Quick'])
      expect(await tagsOf('Full Eight')).toEqual(EIGHT)
      // Some element says "1 skipped" (not "21 skipped": text runs together across elements).
      await waitFor(() => expect([...document.body.querySelectorAll('*')].some((el) => /(^|\D)1 skipped/i.test(el.textContent ?? ''))).toBe(true))
    })
  })

  Scenario('Bulk delete', ({ Given, When, Then, And }) => {
    Given('I selected 3 workouts', async () => {
      await freshState()
      await renderList()
      await selectRows('Push A', 'Leg Day', 'Bench Blast')
    })
    When('I tap "Delete"', async () => {
      await freshState()
      await renderList()
      await selectRows('Push A', 'Leg Day', 'Bench Blast')
      await barAction('Delete')
      expect(await screen.findByRole('alertdialog')).toBeTruthy()
      expect(await byName('Push A')).toHaveLength(1)
    })
    Then('a confirm says "Delete 3 workouts? Your workout history stays."', async () => {
      await freshState()
      await renderList()
      await selectRows('Push A', 'Leg Day', 'Bench Blast')
      await barAction('Delete')
      const dialog = await screen.findByRole('alertdialog')
      expect(dialog.textContent?.replace(/\s+/g, ' ')).toContain('Delete 3 workouts? Your workout history stays.')
      // Cancel deletes nothing.
      await tap(within(dialog).getByRole('button', { name: /^cancel$/i }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      for (const n of ['Push A', 'Leg Day', 'Bench Blast']) expect(await byName(n), n).toHaveLength(1)
    })
    And('confirming deletes them; past sessions done from them are kept', async () => {
      await freshState()
      const done = await sessionFrom('Push A', asPlanned())
      await renderList()
      await selectRows('Push A', 'Leg Day', 'Bench Blast')
      await barAction('Delete')
      const dialog = await screen.findByRole('alertdialog')
      await tap(within(dialog).getByRole('button', { name: /^delete$/i }))
      await untilDb(async () => (await byName('Bench Blast')).length === 0, 'deleted')
      for (const n of ['Push A', 'Leg Day']) expect(await byName(n), n).toHaveLength(0)
      for (const n of ['Squat Focus', 'Full Eight', 'Old Pull', 'Squat Classic']) expect(await byName(n), n).toHaveLength(1)
      await waitFor(() => expect(rowOf('Leg Day')).toBeUndefined())
      const session = await s.prisma.workoutCompletion.findUnique({ where: { id: done }, include: { loggedSets: true } })
      expect(session?.status).toBe('completed')
      expect(session?.loggedSets).toHaveLength(5)
    })
  })

  Scenario('Bulk actions only touch my own workouts', ({ Then, And }) => {
    Then("a bulk request containing another user's workout id changes nothing for that id", async () => {
      await freshState()
      const theirs = s.ids['Their Push']
      const before = await row(theirs)
      const mine = s.ids['Leg Day']
      const arch = await bulk({ action: 'archive', ids: [theirs, mine] })
      expect(arch.status).toBe(200)
      expect(arch.body.ids).toEqual([mine])
      expect(await archived('Leg Day')).toBe(true)
      const tag = await bulk({ action: 'tag', ids: [theirs, s.ids['Bench Blast']], tag: 'Core' })
      expect(tag.status).toBe(200)
      expect(tag.body.ids).toEqual([s.ids['Bench Blast']])
      const del = await bulk({ action: 'delete', ids: [theirs, 'no-such-id', s.ids['Squat Classic']] })
      expect(del.status).toBe(200)
      expect(del.body.ids).toEqual([s.ids['Squat Classic']])
      const undo = await bulk({ action: 'undoArchive', previous: { [theirs]: { pinnedAt: null, dismissedAt: null } } })
      expect(undo.status).toBe(200)
      expect(undo.body.ids).toEqual([])
      expect(await row(theirs)).toEqual(before)
    })
    And('bulk requests are rate limited and capped at 100 workouts', async () => {
      await freshState()
      rl.refuse = true
      for (const body of [
        { action: 'archive', ids: three() },
        { action: 'tag', ids: three(), tag: 'Core' },
        { action: 'delete', ids: three() },
      ])
        expect((await bulk(body)).status, String(body.action)).toBe(429)
      expect(rl.calls.map((c) => c.key)).toContain(s.user)
      rl.refuse = false
      const over = [...three(), ...Array.from({ length: 98 }, (_, i) => `missing-${i}`)]
      expect(over).toHaveLength(101)
      for (const action of ['archive', 'delete']) expect((await bulk({ action, ids: over })).status, action).toBe(400)
      expect((await bulk({ action: 'tag', ids: over, tag: 'Core' })).status).toBe(400)
      for (const n of ['Leg Day', 'Bench Blast', 'Squat Focus']) {
        expect(await archived(n), n).toBe(false)
        expect(await byName(n), n).toHaveLength(1)
      }
      expect(await tagsOf('Bench Blast')).toEqual([])
    })
  })

  // Update vs save as new -----------------------------------------------------------
  Scenario('A session from a saved workout offers Update', ({ Given, And, When, Then }) => {
    Given('I started a session from my saved workout "Push A"', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      const c = await s.prisma.workoutCompletion.findUnique({ where: { id: s.completion } })
      expect(c?.savedWorkoutId).toBe(s.ids['Push A'])
    })
    And('I changed its exercises or sets during the session', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      expect((await rollupOf(String(s.completion))).fromSaved).toEqual({ id: s.ids['Push A'], name: 'Push A', gone: false, matches: false })
      // An added exercise is a change too.
      await s.prisma.workoutCompletion.deleteMany({ where: { id: s.completion } })
      await sessionFrom('Push A', asPlanned(), { reps: [10, 10] })
      expect((await rollupOf(String(s.completion))).fromSaved?.matches).toBe(false)
    })
    When('I finish and the summary opens', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      await renderSummary(String(s.completion))
    })
    Then('instead of a single Save I see "Update Push A" and "Save as new"', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      await renderSummary(String(s.completion))
      expect(button(/^update push a$/i)).toBeTruthy()
      expect(button(/^save as new$/i)).toBeTruthy()
      expect(button(/save workout to repeat/i)).toBeNull()
    })
  })

  Scenario("Update keeps the saved workout's identity", ({ When, Then, And }) => {
    When('I tap "Update Push A"', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      await renderSummary(String(s.completion))
      await tap(button(/^update push a$/i))
      await waitFor(() => expect(bodyText()).toMatch(/updated push a/i))
      expect(button(/^update push a$/i)).toBeNull()
    })
    Then('"Push A" gets this session\'s exercises and sets', async () => {
      await freshState()
      await sessionFrom('Push A', changed(), { reps: [10, 10] })
      await renderSummary(String(s.completion))
      await tap(button(/^update push a$/i))
      await untilDb(async () => (await row(s.ids['Push A']))?.exerciseCount === 3, 'Push A updated')
      const data = (await row(s.ids['Push A']))?.workoutData as Json[]
      expect(data.map((e) => e.exerciseDefinitionId)).toEqual(s.defs.slice(0, 3))
      expect((data[0].sets as Json[]).map((x) => x.reps)).toEqual(['8', '8', '8', '6'])
      expect((data[2].sets as Json[]).map((x) => x.reps)).toEqual(['10', '10'])
    })
    And("keeps its name, notes, tags, pin and origin", async () => {
      await freshState()
      const before = (await row(s.ids['Push A'])) as Json
      await sessionFrom('Push A', changed())
      const res = await update(s.ids['Push A'], { completionId: s.completion })
      expect(res.status, JSON.stringify(res.body)).toBe(200)
      expect((res.body.saved as Json).name).toBe('Push A')
      const after = (await row(s.ids['Push A'])) as Json
      for (const k of KEPT) expect(plain(after[k]), k).toEqual(plain(before[k]))
      expect(after.notes).toBe('Chest day')
      expect(after.tags).toEqual(['Push', 'Quick'])
      expect(after.origin).toBe('agent')
    })
    And('no second "Push A" is created', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      await renderSummary(String(s.completion))
      await tap(button(/^update push a$/i))
      await waitFor(() => expect(bodyText()).toMatch(/updated push a/i))
      expect(await byName('Push A')).toHaveLength(1)
      expect(await s.prisma.savedWorkout.count({ where: { userId: s.user } })).toBe(7)
    })
  })

  Scenario('Save as new', ({ When, Then }) => {
    When('I tap "Save as new"', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      await renderSummary(String(s.completion))
      await tap(button(/^save as new$/i))
      expect(await screen.findByLabelText(/^name$/i)).toBeTruthy()
    })
    Then('a new saved workout is created as today, and "Push A" is unchanged', async () => {
      await freshState()
      const before = await row(s.ids['Push A'])
      await sessionFrom('Push A', changed())
      await renderSummary(String(s.completion))
      await tap(button(/^save as new$/i))
      await act(async () => {
        fireEvent.change(await screen.findByLabelText(/^name$/i), { target: { value: 'Push B' } })
      })
      await tap(button(/^save$/i))
      await untilDb(async () => (await byName('Push B')).length === 1, 'Push B saved')
      const made = (await byName('Push B'))[0]
      expect(made.origin).toBe('session')
      expect(made.sourceCompletionId).toBe(s.completion)
      expect(((made.workoutData as Json[])[0].sets as Json[]).map((x) => x.reps)).toEqual(['8', '8', '8', '6'])
      const after = await row(s.ids['Push A'])
      for (const k of ['workoutData', 'exerciseCount', ...KEPT]) expect(plain(after?.[k]), k).toEqual(plain(before?.[k]))
    })
  })

  Scenario('Nothing changed', ({ Given, Then }) => {
    Given('the session\'s exercises and sets match "Push A"', async () => {
      await freshState()
      await sessionFrom('Push A', asPlanned())
      expect((await rollupOf(String(s.completion))).fromSaved).toEqual({ id: s.ids['Push A'], name: 'Push A', gone: false, matches: true })
    })
    Then('the summary says it matches "Push A" and offers no Update', async () => {
      await freshState()
      // Other reps and RPE: the rule compares structure only.
      await sessionFrom('Push A', [{ reps: [10, 9, 7], rpe: 9 }, { reps: [12, 11] }])
      await renderSummary(String(s.completion))
      expect(bodyText()).toMatch(/matches push a/i)
      expect(button(/^update\b/i)).toBeNull()
    })
  })

  Scenario('The saved workout is gone', ({ Given, Then }) => {
    Given('"Push A" was deleted or archived during the session', async () => {
      await freshState()
      await sessionFrom('Push A', changed())
      await s.prisma.savedWorkout.update({ where: { id: s.ids['Push A'] }, data: { archivedAt: new Date() } })
      expect((await rollupOf(String(s.completion))).fromSaved).toMatchObject({ id: s.ids['Push A'], gone: true, matches: false })
    })
    Then('only "Save as new" is offered', async () => {
      await freshState()
      // Archived during the session.
      await sessionFrom('Push A', changed())
      await s.prisma.savedWorkout.update({ where: { id: s.ids['Push A'] }, data: { archivedAt: new Date() } })
      await renderSummary(String(s.completion))
      expect(button(/^save as new$/i)).toBeTruthy()
      expect(button(/^update\b/i)).toBeNull()
      // The route refuses too, and writes nothing.
      const before = await row(s.ids['Push A'])
      expect((await update(s.ids['Push A'], { completionId: s.completion })).status).toBe(409)
      expect(plain(await row(s.ids['Push A']))).toEqual(plain(before))
      cleanup()
      // Deleted during the session.
      await s.prisma.savedWorkout.delete({ where: { id: s.ids['Push A'] } })
      expect((await rollupOf(String(s.completion))).fromSaved).toEqual({ id: s.ids['Push A'], name: 'Push A', gone: true, matches: false })
      await renderSummary(String(s.completion))
      expect(button(/^save as new$/i)).toBeTruthy()
      expect(button(/^update\b/i)).toBeNull()
      expect((await update(s.ids['Push A'], { completionId: s.completion })).status).toBe(404)
    })
  })

  Scenario('A freestyle session not from a saved workout', ({ Then }) => {
    Then('the summary offers Save as today', async () => {
      await freshState()
      const c = await freestyle()
      expect((await rollupOf(c)).fromSaved).toBeNull()
      await renderSummary(c)
      expect(button(/save workout to repeat/i)).toBeTruthy()
      expect(button(/^update\b/i)).toBeNull()
      expect(button(/^save as new$/i)).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// Edges the scenarios don't pin
// ---------------------------------------------------------------------------
describe('bulk route', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('bad bodies are 400 and write nothing', async () => {
    for (const body of [
      {},
      { action: 'shred', ids: three() },
      { action: 'archive' },
      { action: 'archive', ids: [] },
      { action: 'archive', ids: 'x' },
      { action: 'archive', ids: [1] },
      { action: 'tag', ids: three() },
      { action: 'tag', ids: three(), tag: '   ' },
      { action: 'tag', ids: three(), tag: 7 },
      { action: 'undoArchive', previous: {} },
    ])
      expect((await bulk(body)).status, JSON.stringify(body)).toBe(400)
    for (const n of ['Leg Day', 'Bench Blast', 'Squat Focus']) expect(await archived(n), n).toBe(false)
    expect(await tagsOf('Bench Blast')).toEqual([])
  })

  it('signed out is 401; a database failure is 500 and logged', async () => {
    auth.userId = ''
    expect((await bulk({ action: 'archive', ids: three() })).status).toBe(401)
    auth.userId = s.user
    boom.on = true
    expect((await bulk({ action: 'archive', ids: three() })).status).toBe(500)
    boom.on = false
    expect(log.error).toHaveBeenCalled()
    expect(await archived('Leg Day')).toBe(false)
  })

  it('archive answers with what Undo needs; undoArchive puts pins and dismissals back', async () => {
    const dismissed = new Date(Date.now() - 5000)
    await s.prisma.savedWorkout.update({ where: { id: s.ids['Bench Blast'] }, data: { dismissedAt: dismissed } })
    const pin = (await byName('Push A'))[0].pinnedAt as Date
    const res = await bulk({ action: 'archive', ids: idsOf('Push A', 'Bench Blast') })
    expect(res.status).toBe(200)
    expect(sorted(res.body.ids)).toEqual(sorted(idsOf('Push A', 'Bench Blast')))
    const previous = res.body.previous as Record<string, Json>
    expect(new Date(String(previous[s.ids['Push A']].pinnedAt))).toEqual(pin)
    expect((await byName('Bench Blast'))[0].dismissedAt).toEqual(dismissed)
    // Archiving again changes nothing more.
    expect((await bulk({ action: 'archive', ids: idsOf('Push A') })).body.ids).toEqual([])
    const undo = await bulk({ action: 'undoArchive', previous })
    expect(undo.status).toBe(200)
    expect((await byName('Push A'))[0].pinnedAt).toEqual(pin)
    expect((await byName('Push A'))[0].archivedAt).toBeNull()
    expect((await byName('Bench Blast'))[0].dismissedAt).toEqual(dismissed)
  })

  it('tag reuses slice 2: matches spelling, and leaves a workout already carrying it alone', async () => {
    const res = await bulk({ action: 'tag', ids: idsOf('Leg Day', 'Bench Blast', 'Full Eight'), tag: '  LEGS ' })
    expect(res.status).toBe(200)
    expect(res.body.ids).toEqual([s.ids['Bench Blast']])
    expect(res.body.skipped).toEqual([])
    expect(await tagsOf('Bench Blast')).toEqual(['Legs'])
    expect(await tagsOf('Leg Day')).toEqual(['Legs'])
    const skip = await bulk({ action: 'tag', ids: idsOf('Leg Day', 'Full Eight'), tag: 'quick' })
    expect(skip.body.ids).toEqual([s.ids['Leg Day']])
    expect(skip.body.skipped).toEqual([s.ids['Full Eight']])
    expect(await tagsOf('Leg Day')).toEqual(['Legs', 'Quick'])
  })

  it('tag limits: over 24 characters, or over 50 different tags, is 400 and writes nothing', async () => {
    const long = await bulk({ action: 'tag', ids: three(), tag: 'x'.repeat(25) })
    expect(long.status).toBe(400)
    expect(long.body.limit).toBe('length')
    expect((await bulk({ action: 'tag', ids: three(), tag: 'x'.repeat(24) })).status).toBe(200)
    // Fill the user's different tags up to 50.
    const have = new Set(((await s.prisma.savedWorkout.findMany({ where: { userId: s.user } })) as unknown as Json[]).flatMap((r) => r.tags as string[]))
    const extra = Array.from({ length: 50 - have.size }, (_, i) => `Filler ${i + 1}`)
    for (let i = 0; i < extra.length; i += 8) await seed(`Filler ${i}`, { lastUsedAt: new Date(0), tags: extra.slice(i, i + 8) })
    const full = await bulk({ action: 'tag', ids: idsOf('Squat Classic'), tag: 'One too many' })
    expect(full.status).toBe(400)
    expect(full.body.limit).toBe('perUser')
    expect(await tagsOf('Squat Classic')).toEqual([])
    // An existing tag is still fine at 50.
    expect((await bulk({ action: 'tag', ids: idsOf('Squat Classic'), tag: 'filler 1' })).status).toBe(200)
    expect(await tagsOf('Squat Classic')).toEqual(['Filler 1'])
  })

  it('delete keeps the sessions done from the workout', async () => {
    const done = await sessionFrom('Push A', changed())
    expect((await bulk({ action: 'delete', ids: idsOf('Push A') })).body.ids).toEqual([s.ids['Push A']])
    expect(await byName('Push A')).toHaveLength(0)
    const c = await s.prisma.workoutCompletion.findUnique({ where: { id: done } })
    expect(c?.status).toBe('completed')
  })

  it('archive, tag and delete send the same number of queries for 1 workout as for 10', async () => {
    for (let i = 0; i < 10; i++) await seed(`Many ${i}`, { lastUsedAt: new Date(0), tags: ['Legs'] })
    const many = Array.from({ length: 10 }, (_, i) => s.ids[`Many ${i}`])
    const one = [s.ids['Squat Classic']]
    for (const action of ['tag', 'archive', 'delete']) {
      const count = async (ids: string[]) => {
        const { count: n, result: res } = await countQueries(s.prisma, () => bulk({ action, ids, tag: 'Core' }))
        expect(res.status, action).toBe(200)
        return n
      }
      expect(await count(many), action).toBe(await count(one))
    }
  })
})

describe('update route', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('refuses another session, an unfinished one, someone else\'s, and bad bodies, writing nothing', async () => {
    const id = s.ids['Push A']
    const c = await sessionFrom('Push A', changed())
    const before = plain(await row(id))
    for (const body of [{}, { completionId: '' }, { completionId: 7 }]) expect((await update(id, body)).status, JSON.stringify(body)).toBe(400)
    // A session from another workout can't update Push A.
    await seed('Other', { workoutData: pushPlan(), lastUsedAt: new Date(0) })
    const fromOther = await sessionFrom('Other', changed())
    expect((await update(id, { completionId: fromOther })).status).toBe(400)
    // Unfinished.
    await s.prisma.workoutCompletion.update({ where: { id: c }, data: { status: 'draft' } })
    expect((await update(id, { completionId: c })).status).toBe(400)
    await s.prisma.workoutCompletion.update({ where: { id: c }, data: { status: 'completed' } })
    // Unknown ids and another user's workout are 404.
    expect((await update(id, { completionId: 'nope' })).status).toBe(404)
    expect((await update(s.ids['Their Push'], { completionId: c })).status).toBe(404)
    expect((await update('nope', { completionId: c })).status).toBe(404)
    expect(plain(await row(id))).toEqual(before)
  })

  it('another user\'s session is 404', async () => {
    const c = await sessionFrom('Push A', changed())
    await s.prisma.workoutCompletion.update({ where: { id: c }, data: { userId: s.other } })
    expect((await update(s.ids['Push A'], { completionId: c })).status).toBe(404)
  })

  it('is rate limited keyed on the user, 401 signed out, 500 and logged on a database failure', async () => {
    const id = s.ids['Push A']
    const before = plain(await row(id))
    const c = await sessionFrom('Push A', changed())
    rl.calls.length = 0
    rl.refuse = true
    expect((await update(id, { completionId: c })).status).toBe(429)
    expect(rl.calls.map((x) => x.key)).toContain(s.user)
    rl.refuse = false
    auth.userId = ''
    expect((await update(id, { completionId: c })).status).toBe(401)
    auth.userId = s.user
    boom.on = true
    expect((await update(id, { completionId: c })).status).toBe(500)
    boom.on = false
    expect(log.error).toHaveBeenCalled()
    const after = plain(await row(id))
    expect(after.workoutData).toEqual(before.workoutData)
  })

  it('a session that differs only in reps, RPE or RIR matches, and Update still writes them', async () => {
    const c = await sessionFrom('Push A', [{ reps: [10, 9, 7], rpe: 9 }, { reps: [12, 11], rir: 2 }])
    expect((await rollupOf(c)).fromSaved).toEqual({ id: s.ids['Push A'], name: 'Push A', gone: false, matches: true })
    expect((await update(s.ids['Push A'], { completionId: c })).status).toBe(200)
    const data = (await row(s.ids['Push A']))?.workoutData as Json[]
    const written = (e: Json) => (e.sets as Json[]).map((x) => [x.reps, x.rpe, x.rir])
    expect(written(data[0])).toEqual([['10', 9, null], ['9', 9, null], ['7', 9, null]])
    expect(written(data[1])).toEqual([['12', null, 2], ['11', null, 2]])
  })

  it('a session with a different warmup set, or another exercise in a slot, does not match', async () => {
    const warm = await sessionFrom('Push A', [{ reps: [8, 8, 8], warm: 1 }, { reps: [12, 12] }])
    expect((await rollupOf(warm)).fromSaved?.matches).toBe(false)
    await s.prisma.workoutCompletion.deleteMany({ where: { id: warm } })
    const swapped = await sessionFrom('Push A', asPlanned())
    const fly = await s.prisma.exercise.findFirst({ where: { workoutCompletionId: swapped, order: 2 } })
    await s.prisma.exercise.update({ where: { id: String(fly?.id) }, data: { exerciseDefinitionId: s.defs[2] } })
    expect((await rollupOf(swapped)).fromSaved?.matches).toBe(false)
  })

  it('keeps a name changed during the session, not the name the session started with', async () => {
    const c = await sessionFrom('Push A', changed())
    await s.prisma.savedWorkout.update({ where: { id: s.ids['Push A'] }, data: { name: 'Push Day' } })
    expect((await rollupOf(c)).fromSaved?.name).toBe('Push Day')
    expect((await update(s.ids['Push A'], { completionId: c })).status).toBe(200)
    expect((await row(s.ids['Push A']))?.name).toBe('Push Day')
  })

  it('after Update, Save as new from the same session still makes a new workout', async () => {
    const c = await sessionFrom('Push A', changed())
    expect((await update(s.ids['Push A'], { completionId: c })).status).toBe(200)
    const made = await result(await (await listRoute()).POST(req('/api/workouts/saved', 'POST', { sourceCompletionId: c, name: 'Push B' })))
    expect(made.status).toBe(200)
    expect(await byName('Push B')).toHaveLength(1)
    expect(await byName('Push A')).toHaveLength(1)
  })
})

describe('select mode and summary styling', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('Select all with Older folded and no search selects only the rows that show', async () => {
    await renderList()
    await enterSelect()
    expect(screen.queryByRole('button', { name: /^older \(\d+\)/i })?.getAttribute('aria-expanded')).toBe('false')
    await tap(button(/^select all$/i), 'a Select all button')
    expect(sorted(checkedAmong(ALL))).toEqual(sorted(['Push A', ...RECENT]))
    expect(toolbar().textContent).toMatch(/\b5 selected/i)
    await barAction('Archive')
    await untilDb(async () => archived('Full Eight'), 'shown rows archived')
    for (const n of ['Old Pull', 'Squat Classic']) expect(await archived(n), n).toBe(false)
  })

  it('the Select bar, tag dialog and summary buttons use 48px tap targets and theme colours', async () => {
    await renderList()
    await enterSelect()
    await tapRow('Leg Day')
    const targets = [
      button(/^select all$/i),
      button(/^done$/i),
      ...within(toolbar()).getAllByRole('button'),
    ] as HTMLElement[]
    for (const t of targets) expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
    await barAction('Tag')
    const dialog = await screen.findByRole('dialog', { name: /^tag 1 workouts?$/i })
    for (const t of within(dialog).getAllByRole('button')) expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
    for (const el of document.body.querySelectorAll('[class]'))
      expect(String(el.getAttribute('class'))).not.toMatch(RAW_COLOUR)
    cleanup()

    await sessionFrom('Push A', changed())
    await renderSummary(String(s.completion))
    for (const t of [button(/^update push a$/i), button(/^save as new$/i)] as HTMLElement[]) {
      expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
      expect(t.className).not.toMatch(RAW_COLOUR)
    }
  })
})
