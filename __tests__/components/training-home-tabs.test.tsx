/**
 * TL6 Training as three tabbed blocks (mockup 054): the structure and text of
 * the Training home, rendered. Colours, classes and layout are the reviewer's
 * job. Spec: initiatives/training-library/docs/spec.md ("TL6 final layout").
 *
 * Seams:
 *   components/training/TrainingHome.tsx   (props { home }, as before)
 *   home.suggestions.items[].exerciseCount: number | null   (workout creates only)
 *
 * Structure the tests rely on (roles and text only):
 *   - three regions, in order, named "From your coach", "Workouts", "Program".
 *     The coach block shows only with pending suggestions; the Workouts block
 *     only with pins or recent sessions; the Program block always.
 *   - Workouts and Program each have a tablist. Tabs are role="tab" buttons
 *     with aria-selected: Workouts = "Pinned Workouts" | "Recent" (a tab's name
 *     may continue with a count, so tabs are matched by their start); Program =
 *     "Up Next" | "Active Program". Each tab has a role="tabpanel". Both panels
 *     are in the page; the unselected one is hidden (not accessible). Switching
 *     fetches nothing.
 *   - tab labels are not headings.
 *   - the coach block: a count chip labelled "<n> suggestion(s)", a link named
 *     "All suggestions" to /suggestions, the kind chip first in the card, then
 *     the title, meta line, rationale quote and a "Review suggestion" link, then
 *     up to 2 rows (short kind label, title, link to the review screen).
 *   - there is no "See all" link anywhere.
 *   - an empty tab is still selectable and its panel shows a short line of text.
 *   - Active Program panel: the name, "Week X of Y · N of M workouts done", the
 *     bar (aria-valuenow/max), a link named "View <name>", and, when there is a
 *     next workout, a line "Next: Week W · Day D · <workout>". No Start.
 *   - no active program: the Program block shows "No active program" and a
 *     "Find a program" link to /library?type=programs&tab=browse under BOTH tabs.
 *   - the empty-home screen is gone ("Start a workout", "Nothing planned yet").
 *   - the chosen tab of each block is remembered per device in localStorage and
 *     read after mount: the server render always shows the defaults (Pinned
 *     Workouts if there are pins, else Recent; Up Next if there is a next
 *     workout, else Active Program), and a stored choice applies only when that
 *     tab has content. The key names are not pinned; the tests drive it through
 *     the UI and a remount.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))

type Item = {
  id: string
  kind: string
  title: string
  summary: string
  rationale: string
  createdAt: Date
  exerciseCount: number | null
}
type Home = {
  upNext: unknown
  pinned: Array<{ id: string; name: string; exerciseCount: number; pinnedAt: Date }>
  suggestions: { count: number; items: Item[] }
  recent: Array<{ id: string; name: string; completedAt: Date; durationSeconds: number | null; canRepeat: boolean }>
  currentProgram: unknown
}

const DAY = 86_400_000
const now = () => new Date()
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const WORKOUT: Item = { id: 'g1', kind: 'saved_workout.create', title: 'Short Full-Body Workout', summary: 'New saved workout: Short Full-Body Workout (5 exercises)', rationale: 'You have 30 minutes on busy days', createdAt: now(), exerciseCount: 5 }
const PROGRAM: Item = { id: 'g2', kind: 'program.create', title: 'New 3-Day Strength Program', summary: 'New program: x', rationale: 'A simple block for your schedule', createdAt: daysAgo(1), exerciseCount: null }
const TARGETS: Item = { id: 'g3', kind: 'balance_targets.update', title: 'Quads 1 → 1.3', summary: 'Targets: quads', rationale: 'Your quads lag', createdAt: daysAgo(2), exerciseCount: null }
const UPDATE: Item = { id: 'g4', kind: 'saved_workout.update', title: 'Push day: name', summary: 'Update saved workout', rationale: 'Clearer name', createdAt: now(), exerciseCount: null }
const UP_NEXT = { programId: 'p1', programName: 'Machine Starter', workoutId: 'w2', workoutName: 'Full Body A', weekNumber: 2, dayNumber: 1, exerciseCount: 5, hasDraft: false, href: '/library/programs/p1?week=2&resume=w2' }
const PINS = [
  { id: 's1', name: 'Quick Machines', exerciseCount: 3, pinnedAt: daysAgo(1) },
  { id: 's2', name: 'Mobility', exerciseCount: 1, pinnedAt: daysAgo(2) },
]
const RECENT = [
  { id: 'c1', name: 'Upper Body', completedAt: daysAgo(3), durationSeconds: 2700, canRepeat: true },
  { id: 'c2', name: 'Leg Day', completedAt: daysAgo(4), durationSeconds: 3900, canRepeat: true },
  { id: 'c3', name: 'Quick Arms', completedAt: daysAgo(5), durationSeconds: null, canRepeat: false },
]
const CURRENT = { programId: 'p1', programName: 'Machine Starter', weekNumber: 2, totalWeeks: 5, workoutsDone: 3, workoutsTotal: 10 }
const FULL: Home = {
  upNext: UP_NEXT,
  pinned: PINS,
  suggestions: { count: 3, items: [WORKOUT, PROGRAM, TARGETS] },
  recent: RECENT,
  currentProgram: CURRENT,
}
const EMPTY: Home = { upNext: null, pinned: [], suggestions: { count: 0, items: [] }, recent: [], currentProgram: null }
const home = (over: Partial<Home> = {}): Home => ({ ...EMPTY, ...over })

async function component() {
  return ((await load('@/components/training/TrainingHome')) as { default: ComponentType<{ home: Home }> }).default
}
async function renderHome(data: Home) {
  return render(createElement(await component(), { home: data }))
}
const region = (name: string) => screen.getByRole('region', { name })
const tab = (block: string, name: string) => within(region(block)).getByRole('tab', { name: new RegExp(`^${name}\\b`, 'i') })
const isSelected = (block: string, name: string) => tab(block, name).getAttribute('aria-selected') === 'true'
const panel = (block: string) => within(region(block)).getByRole('tabpanel')
const choose = (block: string, name: string) => fireEvent.click(tab(block, name))

// A small in-memory localStorage, so the tests can make it fail on demand.
// `storage.fail` makes every call throw, like a browser with storage blocked.
// (vitest.config.ts turns off Node's own global localStorage, which would
// otherwise shadow jsdom's on Node 22.4+.)
const storage = (() => {
  const data = new Map<string, string>()
  const state = { fail: false }
  const guard = () => {
    if (state.fail) throw new Error('storage blocked')
  }
  return {
    state,
    clear: () => {
      data.clear()
      state.fail = false
    },
    get length() {
      return data.size
    },
    api: {
      getItem: (k: string) => {
        guard()
        return data.get(k) ?? null
      },
      setItem: (k: string, v: string) => {
        guard()
        data.set(k, String(v))
      },
      removeItem: (k: string) => {
        guard()
        data.delete(k)
      },
      clear: () => data.clear(),
      key: (i: number) => Array.from(data.keys())[i] ?? null,
      get length() {
        return data.size
      },
    },
  }
})()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', storage.api)
  Object.defineProperty(window, 'localStorage', { value: storage.api, configurable: true })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
describe('three blocks: structure', () => {
  it('has the coach, Workouts and Program regions, in that order', async () => {
    await renderHome(FULL)
    const regions = screen.getAllByRole('region')
    expect(regions).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'From your coach' })).toBe(regions[0])
    expect(screen.getByRole('region', { name: 'Workouts' })).toBe(regions[1])
    expect(screen.getByRole('region', { name: 'Program' })).toBe(regions[2])
  })

  it('the tabs are tab buttons, not headings', async () => {
    await renderHome(FULL)
    const headings = screen.queryAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    for (const label of ['Pinned Workouts', 'Recent', 'Up Next', 'Active Program', 'Pinned', 'Current Program']) {
      expect(headings).not.toContain(label)
    }
    expect(within(region('Workouts')).getAllByRole('tab')).toHaveLength(2)
    expect(within(region('Program')).getAllByRole('tab')).toHaveLength(2)
  })

  it('names the tabs: Pinned Workouts | Recent and Up Next | Active Program', async () => {
    await renderHome(FULL)
    expect(tab('Workouts', 'Pinned Workouts')).toBeTruthy()
    expect(tab('Workouts', 'Recent')).toBeTruthy()
    expect(tab('Program', 'Up Next')).toBeTruthy()
    expect(tab('Program', 'Active Program')).toBeTruthy()
  })

  it('the old section names are gone', async () => {
    await renderHome(FULL)
    expect(screen.queryByText(/coach suggestions/i)).toBeNull()
    expect(screen.queryByText(/recent workouts/i)).toBeNull()
    expect(screen.queryByText(/view suggestions/i)).toBeNull()
    expect(screen.queryByText(/view program/i)).toBeNull()
    expect(screen.queryByText(/^current program$/i)).toBeNull()
  })

  it('there is no See all link anywhere', async () => {
    await renderHome(FULL)
    expect(screen.queryAllByRole('link', { name: /see all/i })).toEqual([])
  })

  it('the coach block hides without suggestions', async () => {
    await renderHome(home({ pinned: PINS, upNext: UP_NEXT, currentProgram: CURRENT }))
    expect(screen.queryByRole('region', { name: 'From your coach' })).toBeNull()
  })

  it('the Workouts block hides only with no pins and no recent sessions', async () => {
    await renderHome(home({ upNext: UP_NEXT, currentProgram: CURRENT }))
    expect(screen.queryByRole('region', { name: 'Workouts' })).toBeNull()
    cleanup()
    await renderHome(home({ pinned: PINS }))
    expect(screen.getByRole('region', { name: 'Workouts' })).toBeTruthy()
    cleanup()
    await renderHome(home({ recent: RECENT }))
    expect(screen.getByRole('region', { name: 'Workouts' })).toBeTruthy()
  })

  it('the Program block always shows', async () => {
    await renderHome(EMPTY)
    expect(screen.getByRole('region', { name: 'Program' })).toBeTruthy()
    cleanup()
    await renderHome(home({ pinned: PINS }))
    expect(screen.getByRole('region', { name: 'Program' })).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
describe('coach block', () => {
  it('has a count chip labelled with the count, singular for one', async () => {
    await renderHome(FULL)
    expect(within(region('From your coach')).getByLabelText('3 suggestions').textContent).toBe('3')
    cleanup()
    await renderHome(home({ suggestions: { count: 1, items: [WORKOUT] } }))
    expect(screen.getByLabelText('1 suggestion').textContent).toBe('1')
  })

  it('the chip counts every pending suggestion, not the ones listed', async () => {
    await renderHome(home({ suggestions: { count: 7, items: [WORKOUT, PROGRAM, TARGETS] } }))
    expect(screen.getByLabelText('7 suggestions').textContent).toBe('7')
  })

  it('has an All suggestions link to the list', async () => {
    await renderHome(FULL)
    const link = within(region('From your coach')).getByRole('link', { name: 'All suggestions' })
    expect(link.getAttribute('href')).toBe('/suggestions')
  })

  it('shows the kind chip, title, rationale and a Review suggestion link', async () => {
    await renderHome(FULL)
    const coach = region('From your coach')
    expect(within(coach).getByText('Workout')).toBeTruthy()
    expect(within(coach).getByText('Short Full-Body Workout')).toBeTruthy()
    expect(within(coach).getByText('You have 30 minutes on busy days')).toBeTruthy()
    expect(within(coach).getByRole('link', { name: /^review suggestion$/i }).getAttribute('href')).toBe('/suggestions/g1')
    expect(within(coach).queryByRole('link', { name: /^review$/i })).toBeNull()
  })

  it('the card starts with the kind chip, before the title, with no "Your coach suggests" or "Waiting on you"', async () => {
    await renderHome(FULL)
    const coach = region('From your coach')
    const chip = within(coach).getByText('Workout')
    const title = within(coach).getByText('Short Full-Body Workout')
    expect(chip.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/your coach suggests|waiting on you/i)
  })

  it('never shows the service summary or the word "proposal"', async () => {
    await renderHome(FULL)
    expect(screen.queryByText(/new saved workout/i)).toBeNull()
    expect(document.body.textContent).not.toMatch(/proposal/i)
  })

  it.each([
    [WORKOUT, 'Workout'],
    [UPDATE, 'Workout change'],
    [PROGRAM, 'Program'],
    [TARGETS, 'Training targets'],
    [{ ...WORKOUT, kind: 'anchors.update' }, 'Anchor lifts'],
  ])('the card labels the newest %#: %s', async (item, label) => {
    await renderHome(home({ suggestions: { count: 1, items: [item as Item] } }))
    expect(within(region('From your coach')).getByText(label)).toBeTruthy()
  })

  it('the meta line for a workout counts its exercises', async () => {
    await renderHome(home({ suggestions: { count: 1, items: [WORKOUT] } }))
    expect(await screen.findByText('5 exercises · suggested today')).toBeTruthy()
  })

  it('says "1 exercise" in the singular', async () => {
    await renderHome(home({ suggestions: { count: 1, items: [{ ...WORKOUT, exerciseCount: 1 }] } }))
    expect(await screen.findByText('1 exercise · suggested today')).toBeTruthy()
  })

  it('the meta line for anything else is just when it was suggested', async () => {
    await renderHome(home({ suggestions: { count: 1, items: [{ ...PROGRAM, createdAt: now() }] } }))
    expect(await screen.findByText('suggested today')).toBeTruthy()
  })

  it('says "yesterday" for yesterday and the date for older', async () => {
    await renderHome(home({ suggestions: { count: 1, items: [{ ...PROGRAM, createdAt: daysAgo(1) }] } }))
    expect(await screen.findByText('suggested yesterday')).toBeTruthy()
    cleanup()
    const old = daysAgo(10)
    await renderHome(home({ suggestions: { count: 1, items: [{ ...PROGRAM, createdAt: old }] } }))
    expect(await screen.findByText(`suggested ${fmt(old)}`)).toBeTruthy()
  })

  it('lists the other suggestions as rows with the short kind label', async () => {
    await renderHome(FULL)
    const coach = region('From your coach')
    const rows = [
      [PROGRAM, '/suggestions/g2', 'Program'],
      [TARGETS, '/suggestions/g3', 'Targets'],
    ] as const
    for (const [item, href, label] of rows) {
      const link = within(coach).getByText(item.title).closest('a') as HTMLElement
      expect(link.getAttribute('href')).toBe(href)
      expect(within(link).getByText(label)).toBeTruthy()
      expect(within(coach).queryByText(item.rationale)).toBeNull()
    }
  })

  it('shows at most two other rows, and none for a single suggestion', async () => {
    await renderHome(home({ suggestions: { count: 4, items: [WORKOUT, PROGRAM, TARGETS, UPDATE] } }))
    expect(within(region('From your coach')).queryByText(UPDATE.title)).toBeNull()
    cleanup()
    await renderHome(home({ suggestions: { count: 1, items: [WORKOUT] } }))
    expect(within(region('From your coach')).queryByText(PROGRAM.title)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('Workouts block: tabs', () => {
  it('opens on Pinned Workouts when there are pins', async () => {
    await renderHome(FULL)
    expect(isSelected('Workouts', 'Pinned Workouts')).toBe(true)
    expect(isSelected('Workouts', 'Recent')).toBe(false)
    const shown = panel('Workouts')
    expect(within(shown).getByText('Quick Machines')).toBeTruthy()
    expect(within(shown).queryByText('Upper Body')).toBeNull()
  })

  it('opens on Recent when there are no pins', async () => {
    await renderHome(home({ recent: RECENT }))
    expect(isSelected('Workouts', 'Recent')).toBe(true)
    expect(within(panel('Workouts')).getByText('Upper Body')).toBeTruthy()
  })

  it('switching shows the other list and hides this one', async () => {
    await renderHome(FULL)
    choose('Workouts', 'Recent')
    expect(isSelected('Workouts', 'Recent')).toBe(true)
    expect(isSelected('Workouts', 'Pinned Workouts')).toBe(false)
    const shown = panel('Workouts')
    expect(within(shown).getByText('Upper Body')).toBeTruthy()
    expect(within(shown).queryByText('Quick Machines')).toBeNull()
    choose('Workouts', 'Pinned Workouts')
    expect(within(panel('Workouts')).getByText('Quick Machines')).toBeTruthy()
  })

  it('both panels are in the page, one hidden, and switching fetches nothing', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await renderHome(FULL)
    expect(within(region('Workouts')).getAllByRole('tabpanel', { hidden: true })).toHaveLength(2)
    expect(within(region('Workouts')).getAllByRole('tabpanel')).toHaveLength(1)
    choose('Workouts', 'Recent')
    choose('Workouts', 'Pinned Workouts')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Pinned rows keep the name, count and Start, Recent rows keep Repeat and the duration', async () => {
    await renderHome(FULL)
    const pinned = panel('Workouts')
    expect(within(pinned).getByText('3 exercises')).toBeTruthy()
    expect(within(pinned).getByText('1 exercise')).toBeTruthy()
    expect(within(pinned).getAllByRole('button', { name: /start/i })).toHaveLength(2)
    choose('Workouts', 'Recent')
    const recent = panel('Workouts')
    expect(within(recent).getAllByRole('button', { name: /repeat/i })).toHaveLength(2)
    expect(within(recent).getByText('45 min')).toBeTruthy()
  })

  it('an empty tab is still selectable and shows a short line', async () => {
    await renderHome(home({ pinned: PINS }))
    choose('Workouts', 'Recent')
    expect(isSelected('Workouts', 'Recent')).toBe(true)
    const shown = panel('Workouts')
    expect((shown.textContent ?? '').trim().length).toBeGreaterThan(0)
    expect(within(shown).queryAllByRole('button')).toEqual([])
    cleanup()
    await renderHome(home({ recent: RECENT }))
    choose('Workouts', 'Pinned Workouts')
    expect(isSelected('Workouts', 'Pinned Workouts')).toBe(true)
    expect((panel('Workouts').textContent ?? '').trim().length).toBeGreaterThan(0)
    expect(within(panel('Workouts')).queryByText('Upper Body')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('Program block: tabs', () => {
  it('opens on Up Next when there is a next workout', async () => {
    await renderHome(FULL)
    expect(isSelected('Program', 'Up Next')).toBe(true)
    const up = panel('Program')
    expect(within(up).getByText('Machine Starter')).toBeTruthy()
    expect(within(up).getByText('Week 2 · Day 1')).toBeTruthy()
    expect(within(up).getByText('Full Body A')).toBeTruthy()
    expect(within(up).getByText('5 exercises')).toBeTruthy()
    expect(within(up).getByRole('link', { name: /start workout/i }).getAttribute('href')).toBe(UP_NEXT.href)
  })

  it('Continue replaces Start when a draft exists', async () => {
    await renderHome(home({ upNext: { ...UP_NEXT, hasDraft: true }, currentProgram: CURRENT }))
    expect(within(panel('Program')).getByRole('link', { name: /continue/i })).toBeTruthy()
    expect(within(panel('Program')).queryByRole('link', { name: /start workout/i })).toBeNull()
  })

  it('opens on Active Program when every workout is done', async () => {
    await renderHome(home({ currentProgram: { ...CURRENT, weekNumber: 5, workoutsDone: 10 } }))
    expect(isSelected('Program', 'Active Program')).toBe(true)
    expect(within(panel('Program')).getByText('Week 5 of 5 · 10 of 10 workouts done')).toBeTruthy()
  })

  it('Active Program shows the name, the combined line, the bar and a named View link', async () => {
    await renderHome(FULL)
    choose('Program', 'Active Program')
    const shown = panel('Program')
    expect(within(shown).getByText('Machine Starter')).toBeTruthy()
    expect(within(shown).getByText('Week 2 of 5 · 3 of 10 workouts done')).toBeTruthy()
    const bar = within(shown).getByRole('progressbar')
    expect([bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['3', '10'])
    const link = within(shown).getByRole('link', { name: 'View Machine Starter' })
    expect(link.getAttribute('href')).toBe('/library/programs/p1')
    expect(within(shown).queryByRole('link', { name: /^view$/i })).toBeNull()
  })

  it('Active Program says what is next, and has no Start', async () => {
    await renderHome(FULL)
    choose('Program', 'Active Program')
    const shown = panel('Program')
    expect(within(shown).getByText('Next: Week 2 · Day 1 · Full Body A')).toBeTruthy()
    expect(within(shown).queryByRole('link', { name: /^(start|continue)\b/i })).toBeNull()
    expect(within(shown).queryByRole('button', { name: /^(start|continue)\b/i })).toBeNull()
  })

  it('Active Program has no Next line when nothing is left', async () => {
    await renderHome(home({ currentProgram: { ...CURRENT, weekNumber: 5, workoutsDone: 10 } }))
    expect(within(panel('Program')).queryByText(/^next:/i)).toBeNull()
  })

  it('switching back and forth shows the right panel each time and fetches nothing', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await renderHome(FULL)
    choose('Program', 'Active Program')
    expect(within(panel('Program')).queryByRole('link', { name: /start workout/i })).toBeNull()
    choose('Program', 'Up Next')
    expect(within(panel('Program')).getByRole('link', { name: /start workout/i })).toBeTruthy()
    expect(within(region('Program')).getAllByRole('tabpanel', { hidden: true })).toHaveLength(2)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('Program block: no active program', () => {
  const placeholder = () => {
    const shown = panel('Program')
    expect(within(shown).getByText(/no active program/i)).toBeTruthy()
    const link = within(shown).getByRole('link', { name: /find a program/i })
    const url = new URL(link.getAttribute('href') as string, 'http://x')
    expect([url.pathname, url.searchParams.get('type'), url.searchParams.get('tab')]).toEqual(['/library', 'programs', 'browse'])
  }

  it('shows the placeholder under both tabs', async () => {
    await renderHome(home({ pinned: PINS }))
    expect(tab('Program', 'Up Next')).toBeTruthy()
    expect(tab('Program', 'Active Program')).toBeTruthy()
    placeholder()
    choose('Program', 'Up Next')
    placeholder()
    choose('Program', 'Active Program')
    placeholder()
  })

  it('has no Start and no progress bar', async () => {
    await renderHome(home({ recent: RECENT }))
    expect(within(region('Program')).queryByRole('progressbar')).toBeNull()
    expect(within(region('Program')).queryByRole('link', { name: /start/i })).toBeNull()
  })
})

describe('empty home', () => {
  it('has only the Program placeholder when there is nothing at all', async () => {
    await renderHome(EMPTY)
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Program' })).toBeTruthy()
    expect(within(region('Program')).getByRole('link', { name: /find a program/i })).toBeTruthy()
  })

  it('the old empty-home screen is gone', async () => {
    await renderHome(EMPTY)
    expect(screen.queryByText(/start a workout/i)).toBeNull()
    expect(screen.queryByText(/nothing planned yet/i)).toBeNull()
    expect(screen.getAllByRole('link', { name: /find a program/i })).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
describe('remembering the tab (per device, read after mount)', () => {
  it('a Workouts choice is remembered across a reload', async () => {
    const first = await renderHome(FULL)
    choose('Workouts', 'Recent')
    first.unmount()
    await renderHome(FULL)
    await waitFor(() => expect(isSelected('Workouts', 'Recent')).toBe(true))
    expect(within(panel('Workouts')).getByText('Upper Body')).toBeTruthy()
  })

  it('a Program choice is remembered across a reload', async () => {
    const first = await renderHome(FULL)
    choose('Program', 'Active Program')
    first.unmount()
    await renderHome(FULL)
    await waitFor(() => expect(isSelected('Program', 'Active Program')).toBe(true))
  })

  it('the two blocks are remembered separately', async () => {
    const first = await renderHome(FULL)
    choose('Workouts', 'Recent')
    first.unmount()
    await renderHome(FULL)
    await waitFor(() => expect(isSelected('Workouts', 'Recent')).toBe(true))
    expect(isSelected('Program', 'Up Next')).toBe(true)
    expect(storage.length).toBeGreaterThan(0)
  })

  it('choosing in both blocks stores two separate entries', async () => {
    await renderHome(FULL)
    choose('Workouts', 'Recent')
    choose('Program', 'Active Program')
    expect(storage.length).toBe(2)
  })

  it('the server render always shows the defaults, whatever is stored', async () => {
    const first = await renderHome(FULL)
    choose('Workouts', 'Recent')
    choose('Program', 'Active Program')
    first.unmount()
    const html = renderToString(createElement(await component(), { home: FULL }))
    const box = document.createElement('div')
    box.innerHTML = html
    const selectedTabs = Array.from(box.querySelectorAll('[role="tab"][aria-selected="true"]')).map((t) => (t.textContent ?? '').trim())
    expect(selectedTabs.some((t) => /^pinned workouts/i.test(t))).toBe(true)
    expect(selectedTabs.some((t) => /^up next/i.test(t))).toBe(true)
    expect(selectedTabs.some((t) => /^recent/i.test(t))).toBe(false)
    expect(selectedTabs.some((t) => /^active program/i.test(t))).toBe(false)
  })

  it('a stored choice never opens an empty panel: Recent with no recent falls back to Pinned', async () => {
    const first = await renderHome(FULL)
    choose('Workouts', 'Recent')
    first.unmount()
    await renderHome(home({ pinned: PINS }))
    await waitFor(() => expect(isSelected('Workouts', 'Pinned Workouts')).toBe(true))
    expect(within(panel('Workouts')).getByText('Quick Machines')).toBeTruthy()
  })

  it('a stored choice never opens an empty panel: Pinned with no pins falls back to Recent', async () => {
    const first = await renderHome(FULL)
    choose('Workouts', 'Recent')
    choose('Workouts', 'Pinned Workouts')
    first.unmount()
    await renderHome(home({ recent: RECENT }))
    await waitFor(() => expect(isSelected('Workouts', 'Recent')).toBe(true))
    expect(within(panel('Workouts')).getByText('Upper Body')).toBeTruthy()
  })

  it('Up Next stored with no next workout falls back to Active Program', async () => {
    const first = await renderHome(FULL)
    choose('Program', 'Active Program')
    choose('Program', 'Up Next')
    first.unmount()
    await renderHome(home({ currentProgram: { ...CURRENT, workoutsDone: 10 } }))
    await waitFor(() => expect(isSelected('Program', 'Active Program')).toBe(true))
  })

  it('works when localStorage cannot be read', async () => {
    storage.state.fail = true
    await renderHome(FULL)
    expect(isSelected('Workouts', 'Pinned Workouts')).toBe(true)
    choose('Workouts', 'Recent')
    expect(isSelected('Workouts', 'Recent')).toBe(true)
  })
})
