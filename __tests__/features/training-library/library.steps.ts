/**
 * Step definitions for features/training-library/library.feature.
 * Codes strictly against initiatives/training-library/docs/spec.md ("TL3 Library").
 * The seams are listed in library-support.ts. No database: the Library is
 * rendered with its data and search params, and the redirects are pure.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFetch, load, MS, nav, OS, parse, program, SAVED, viewProps, WEEK_INFO } from './library-support'

vi.mock('next/navigation', async () => {
  const { nav } = await import('./library-support')
  return {
    useRouter: () => ({ push: nav.push, refresh: nav.refresh, replace: nav.replace, back: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => nav.pathname,
    useSearchParams: () => new URLSearchParams(nav.search),
  }
})
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  useDraftWorkout: () => ({ activeDraft: null, refreshDraft: vi.fn(), clearDraft: vi.fn() }),
}))
vi.mock('@/components/QuickActionSheet', () => ({ default: () => null }))
vi.mock('@/components/ThemeSelector', () => ({ ThemeSelector: () => null }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
  ToastProvider: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/components/community/CommunityProgramsView', async () => {
  const { createElement } = await import('react')
  return { default: () => createElement('div', null, 'BROWSE PROGRAMS CONTENT') }
})

const feature = await loadFeature('features/training-library/library.feature')

type LibraryProps = ReturnType<typeof viewProps>

async function openLibrary(search: string, over: Record<string, unknown> = {}) {
  cleanup()
  nav.search = search
  nav.pathname = '/library'
  const mod = (await load('@/components/library/LibraryView')) as { default: ComponentType<LibraryProps> }
  return render(createElement(mod.default, viewProps(over)))
}
async function renderNav(which: 'bottom' | 'header', pathname: string) {
  cleanup()
  nav.pathname = pathname
  if (which === 'bottom') {
    const mod = (await load('@/components/BottomNav')) as { default: ComponentType }
    return render(createElement(mod.default))
  }
  const mod = (await load('@/components/Header')) as { default: ComponentType<{ userEmail: string }> }
  return render(createElement(mod.default, { userEmail: 'a@b.c' }))
}
const tab = (name: RegExp) => screen.getByRole('tab', { name })
const selected = (name: RegExp) => tab(name).getAttribute('aria-selected') === 'true'
const current = () => screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')

let target = ''

beforeEach(() => {
  nav.search = ''
  nav.pathname = '/library'
  nav.push.mockClear()
  nav.refresh.mockClear()
  installFetch({ saved: SAVED })
})
// vitest-cucumber runs each step as its own test and Testing Library cleans the
// page after every test. So a When step records what to render in `pending`,
// and each Then/And step calls `shown()` to render it again before asserting.
let pending: (() => Promise<unknown>) | null = null
const shown = async () => {
  await (pending as () => Promise<unknown>)()
}

describeFeature(feature, ({ Rule }) => {
  Rule('Library is a tab with workouts and programs', ({ RuleScenario }) => {
    RuleScenario('The nav shows Library instead of Programs', ({ When, Then, And }) => {
      When('the user opens any page', async () => {
        pending = () => renderNav('bottom', '/library/programs/p-os')
        await shown()
      })
      Then('the nav shows Training, Library, Workout, Learn and Settings', async () => {
        await shown()
        const links = screen.getAllByRole('link')
        expect(links.map((a) => a.textContent)).toEqual(['Training', 'Library', 'Learn', 'Settings'])
        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/training', '/library', '/learn', '/settings'])
        const workout = screen.getByRole('button', { name: /quick actions/i })
        expect(links[1].compareDocumentPosition(workout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(workout.compareDocumentPosition(links[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(screen.queryByRole('link', { name: /programs/i })).toBeNull()
        cleanup()
        await renderNav('header', '/library')
        const top = screen.getAllByRole('link').filter((a) => ['Training', 'Library', 'Programs', 'Learn'].includes(a.textContent ?? ''))
        expect(top.map((a) => a.textContent)).toEqual(['Training', 'Library', 'Learn'])
      })
      And('Library is highlighted on the Library and on a program\'s detail page', async () => {
        for (const path of ['/library', '/library?type=programs', '/library/programs/p-os']) {
          for (const which of ['bottom', 'header'] as const) {
            cleanup()
            await renderNav(which, path.split('?')[0])
            expect(current().map((a) => a.textContent)).toEqual(['Library'])
          }
        }
      })
    })

    RuleScenario('Library opens on programs', ({ Given, When, Then }) => {
      Given('the user has programs', () => {
        expect(viewProps().strengthPrograms.length).toBeGreaterThan(0)
      })
      When('the user opens the Library', async () => {
        pending = () => openLibrary('')
        await shown()
      })
      Then('they see "LIBRARY" with Programs selected and My Programs shown', async () => {
        await shown()
        expect(screen.getByRole('heading', { level: 1 }).textContent?.toUpperCase()).toBe('LIBRARY')
        expect(selected(/^programs$/i)).toBe(true)
        expect(selected(/^workouts$/i)).toBe(false)
        expect(selected(/my programs/i)).toBe(true)
        expect(screen.getByText('Machine Starter')).toBeTruthy()
        expect(screen.getByText('Old Split')).toBeTruthy()
        expect(screen.queryByText('BROWSE PROGRAMS CONTENT')).toBeNull()
      })
    })

    RuleScenario('Switching to workouts shows My Workouts', ({ Given, When, Then, And }) => {
      Given('the user has a saved workout "Push day"', () => {
        installFetch({ saved: SAVED })
      })
      When('the user switches the Library to Workouts', async () => {
        pending = async () => {
          await openLibrary('')
          fireEvent.click(tab(/^workouts$/i))
        }
        await shown()
      })
      Then('they see My Workouts with "Push day"', async () => {
        await shown()
        expect(selected(/^workouts$/i)).toBe(true)
        expect(screen.getByRole('heading', { name: /my workouts/i })).toBeTruthy()
        expect(await screen.findByText('Push day')).toBeTruthy()
        expect(screen.queryByText('Machine Starter')).toBeNull()
      })
      And('there is no create action and no Browse', async () => {
        await shown()
        await screen.findByText('Push day')
        expect(screen.queryByText(/create new/i)).toBeNull()
        expect(screen.queryByRole('tab', { name: /browse/i })).toBeNull()
        expect(screen.queryByRole('tab', { name: /my programs/i })).toBeNull()
        expect(screen.getAllByRole('tab')).toHaveLength(2)
        expect(screen.queryByText('BROWSE PROGRAMS CONTENT')).toBeNull()
      })
    })

    RuleScenario('A first-time user lands on Browse', ({ Given, When, Then }) => {
      Given('the user has no programs', () => {
        expect(viewProps({ strengthPrograms: [] }).strengthPrograms).toHaveLength(0)
      })
      When('the user opens the Library', async () => {
        pending = () => openLibrary('', { strengthPrograms: [], activeWeekInfo: null, programCount: 0 })
        await shown()
      })
      Then('Programs → Browse is shown', async () => {
        await shown()
        expect(selected(/^programs$/i)).toBe(true)
        expect(selected(/^browse$/i)).toBe(true)
        expect(screen.getByText('BROWSE PROGRAMS CONTENT')).toBeTruthy()
      })
    })
  })

  Rule('My Programs is a plain collection', ({ RuleScenario }) => {
    RuleScenario('The active program is a normal entry with a badge', ({ Given, When, Then, And }) => {
      Given('the user has an active program "Machine Starter" in week 2 of 5 and another program "Old Split"', () => {
        expect(MS.isActive).toBe(true)
        expect(WEEK_INFO).toEqual({ weekNumber: 2, totalWeeks: 5 })
      })
      When('the user opens My Programs', async () => {
        pending = () => openLibrary('?type=programs')
        await shown()
      })
      Then('"Machine Starter" is listed first with ACTIVE and "Week 2 of 5"', async () => {
        await shown()
        const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
        expect(names[0]).toBe('Machine Starter')
        const row = screen.getByText('Machine Starter').closest('button') as HTMLElement
        expect(row.textContent).toMatch(/active/i)
        expect(row.textContent).toMatch(/week 2 of 5/i)
      })
      And('"Old Split" is listed too', async () => {
        await shown()
        const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
        expect(names).toEqual(['Machine Starter', 'Old Split'])
        const row = screen.getByText('Old Split').closest('button') as HTMLElement
        expect(row.textContent).not.toMatch(/active|week \d+ of/i)
      })
      And('there is no separate active-program card', async () => {
        await shown()
        expect(screen.getAllByText('Machine Starter')).toHaveLength(1)
        expect(screen.queryByText(/no active program/i)).toBeNull()
      })
    })

    RuleScenario('Opening a program from the Library', ({ When, Then, And }) => {
      When('the user chooses View on "Old Split"', async () => {
        pending = async () => {
          await openLibrary('')
          fireEvent.click(screen.getByText('Old Split'))
        }
        await shown()
      })
      Then('they land on the "Old Split" detail screen', async () => {
        await shown()
        const view = screen.getByRole('link', { name: /^view$/i })
        expect(view.getAttribute('href')).toBe('/library/programs/p-os')
      })
      And('its back link returns to the Library', async () => {
        cleanup()
        const mod = (await load('@/components/programs/ProgramBackLink')) as { default: ComponentType }
        render(createElement(mod.default))
        const back = screen.getByRole('link', { name: /library/i })
        const { path, params } = parse(back.getAttribute('href') as string)
        expect([path, params]).toEqual(['/library', { type: ['programs'] }])
        expect(screen.queryByText(/training/i)).toBeNull()
      })
    })

    RuleScenario('Create New Program is only on programs', ({ When, Then }) => {
      When('the user opens My Programs', async () => {
        pending = () => openLibrary('?type=programs')
        await shown()
      })
      Then('"Create New Program" is shown', async () => {
        await shown()
        const create = screen.getByText(/create new program/i).closest('a')
        expect(create?.getAttribute('href')).toBe('/programs/new')
      })
    })
  })

  Rule('Old addresses still work', ({ RuleScenario }) => {
    RuleScenario('The old Programs address redirects', ({ When, Then }) => {
      When('the user opens the old Programs address with the Browse tab', async () => {
        const mod = (await load('@/lib/library/links')) as { legacyProgramsRedirectTarget: (q: Record<string, string>) => string }
        target = mod.legacyProgramsRedirectTarget({ tab: 'browse' })
      })
      Then('they land on the Library with Programs → Browse', async () => {
        const { path, params } = parse(target)
        expect(path).toBe('/library')
        expect(params).toEqual({ type: ['programs'], tab: ['browse'] })
        await openLibrary(new URL(target, 'http://x').search)
        expect(selected(/^programs$/i)).toBe(true)
        expect(selected(/^browse$/i)).toBe(true)
        expect(screen.getByText('BROWSE PROGRAMS CONTENT')).toBeTruthy()
      })
    })

    RuleScenario('The old saved workouts address redirects', ({ When, Then }) => {
      When('the user opens the old saved workouts address', async () => {
        const mod = (await load('@/lib/library/links')) as { legacySavedWorkoutsRedirectTarget: (q: Record<string, string>) => string }
        target = mod.legacySavedWorkoutsRedirectTarget({})
      })
      Then('they land on the Library with Workouts shown', async () => {
        const { path, params } = parse(target)
        expect(path).toBe('/library')
        expect(params).toEqual({ type: ['workouts'] })
        await openLibrary(new URL(target, 'http://x').search)
        expect(selected(/^workouts$/i)).toBe(true)
        expect(await screen.findByText('Push day')).toBeTruthy()
      })
    })

    RuleScenario('Adding a community program still shows its progress', ({ When, Then }) => {
      When('the user adds a community program from Browse', async () => {
        installFetch({ addedProgramId: 'p-new' })
        const mod = (await load('@/components/community/CommunityProgramCard')) as { default: ComponentType<Record<string, unknown>> }
        render(
          createElement(mod.default, {
            program: {
              id: 'cp1',
              name: 'Community Plan',
              description: 'A plan',
              programType: 'strength',
              authorUserId: 'someone',
              displayName: 'Someone',
              publishedAt: new Date('2026-10-01T12:00:00Z'),
              weekCount: 4,
              workoutCount: 12,
              exerciseCount: 40,
              goals: [],
              level: null,
              durationDisplay: null,
              targetDaysPerWeek: 3,
              equipmentNeeded: [],
              focusAreas: [],
            },
            currentUserId: 'u1',
            hasAccess: true,
            maxPrograms: 3,
          })
        )
        fireEvent.click(screen.getByRole('button', { name: /add to my programs/i }))
        await waitFor(() => expect(nav.push).toHaveBeenCalled())
        target = nav.push.mock.calls[0][0] as string
        cleanup()
      })
      Then('the Library shows that program being added', async () => {
        const { path, params } = parse(target)
        expect(path).toBe('/library')
        expect(params).toEqual({ type: ['programs'], cloning: ['p-new'] })
        installFetch({ copy: { status: 'cloning', progress: { currentWeek: 2, totalWeeks: 4 } } })
        const adding = program({ id: 'p-new', name: 'Community Plan', copyStatus: 'cloning_week_2' })
        await openLibrary(new URL(target, 'http://x').search, { strengthPrograms: [MS, adding] })
        expect(selected(/my programs/i)).toBe(true)
        expect(await screen.findByText(/cloning 2\/4/i)).toBeTruthy()
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Redirect targets and link helpers (pure)
// ---------------------------------------------------------------------------
type Links = {
  libraryHref: (o?: { type?: string; tab?: string; cloning?: string }) => string
  parseLibraryType: (raw: string | string[] | undefined) => string
  legacyProgramsRedirectTarget: (q: Record<string, string | string[] | undefined>) => string
  legacySavedWorkoutsRedirectTarget: (q: Record<string, string | string[] | undefined>) => string
  legacyCommunityRedirectTarget: () => string
}
const links = async () => (await load('@/lib/library/links')) as Links

describe('library links: libraryHref', () => {
  afterEach(cleanup)
  it('is /library with nothing', async () => {
    const { libraryHref } = await links()
    expect(libraryHref()).toBe('/library')
    expect(libraryHref({})).toBe('/library')
  })

  it('carries type, tab and cloning when given, and only those', async () => {
    const { libraryHref } = await links()
    expect(parse(libraryHref({ type: 'workouts' }))).toEqual({ path: '/library', params: { type: ['workouts'] } })
    expect(parse(libraryHref({ type: 'programs', tab: 'browse' })).params).toEqual({ type: ['programs'], tab: ['browse'] })
    expect(parse(libraryHref({ type: 'programs', cloning: 'p1' })).params).toEqual({ type: ['programs'], cloning: ['p1'] })
  })
})

describe('library links: parseLibraryType', () => {
  afterEach(cleanup)
  it.each([
    [undefined, 'programs'],
    ['', 'programs'],
    ['programs', 'programs'],
    ['workouts', 'workouts'],
    ['cardio', 'programs'],
    ['WORKOUTS', 'programs'],
    ['workouts ', 'programs'],
  ])('%j is %s', async (raw, expected) => {
    const { parseLibraryType } = await links()
    expect(parseLibraryType(raw)).toBe(expected)
  })
})

describe('library links: old addresses', () => {
  afterEach(cleanup)
  it('/programs goes to the Library programs', async () => {
    const { legacyProgramsRedirectTarget } = await links()
    expect(parse(legacyProgramsRedirectTarget({}))).toEqual({ path: '/library', params: { type: ['programs'] } })
  })

  it('/programs keeps tab and cloning', async () => {
    const { legacyProgramsRedirectTarget } = await links()
    expect(parse(legacyProgramsRedirectTarget({ tab: 'browse' })).params).toEqual({ type: ['programs'], tab: ['browse'] })
    expect(parse(legacyProgramsRedirectTarget({ cloning: 'p9' })).params).toEqual({ type: ['programs'], cloning: ['p9'] })
    expect(parse(legacyProgramsRedirectTarget({ tab: 'browse', cloning: 'p9' })).params).toEqual({
      type: ['programs'],
      tab: ['browse'],
      cloning: ['p9'],
    })
  })

  it('/programs keeps the rest of the query too, repeated values included, skipping undefined', async () => {
    const { legacyProgramsRedirectTarget } = await links()
    const t = legacyProgramsRedirectTarget({ tab: 'browse', utm: ['a', 'b'], gone: undefined })
    expect(parse(t).params).toEqual({ type: ['programs'], tab: ['browse'], utm: ['a', 'b'] })
  })

  it('/programs always lands on programs, whatever type was in the query', async () => {
    const { legacyProgramsRedirectTarget } = await links()
    expect(parse(legacyProgramsRedirectTarget({ type: 'workouts' })).params).toEqual({ type: ['programs'] })
  })

  it('/workouts/saved goes to the Library workouts', async () => {
    const { legacySavedWorkoutsRedirectTarget } = await links()
    expect(parse(legacySavedWorkoutsRedirectTarget({}))).toEqual({ path: '/library', params: { type: ['workouts'] } })
  })

  it('/workouts/saved keeps the rest of the query and fixes the type', async () => {
    const { legacySavedWorkoutsRedirectTarget } = await links()
    expect(parse(legacySavedWorkoutsRedirectTarget({ ref: 'sheet', type: 'programs' })).params).toEqual({
      type: ['workouts'],
      ref: ['sheet'],
    })
  })

  it('/community goes straight to Library programs Browse', async () => {
    const { legacyCommunityRedirectTarget } = await links()
    expect(parse(legacyCommunityRedirectTarget())).toEqual({
      path: '/library',
      params: { type: ['programs'], tab: ['browse'] },
    })
  })
})

// ---------------------------------------------------------------------------
// Edges: the Library view
// ---------------------------------------------------------------------------
describe('library view: follows the address while mounted', () => {
  afterEach(cleanup)

  async function mountAt(search: string, over: Record<string, unknown> = {}) {
    const result = await openLibrary(search, over)
    const mod = (await load('@/components/library/LibraryView')) as { default: ComponentType<LibraryProps> }
    const goto = (next: string, nextOver: Record<string, unknown> = over) => {
      nav.search = next
      result.rerender(createElement(mod.default, viewProps(nextOver)))
    }
    return goto
  }

  it('?type=workouts to no type shows Programs', async () => {
    const goto = await mountAt('?type=workouts')
    expect(selected(/^workouts$/i)).toBe(true)
    goto('')
    expect(selected(/^programs$/i)).toBe(true)
    expect(screen.getByText('Machine Starter')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /my workouts/i })).toBeNull()
  })

  it('?type=workouts to ?type=programs shows Programs', async () => {
    const goto = await mountAt('?type=workouts')
    goto('?type=programs')
    expect(selected(/^programs$/i)).toBe(true)
    expect(screen.getByText('Machine Starter')).toBeTruthy()
  })

  it('Programs to ?type=workouts shows Workouts and the saved list', async () => {
    const goto = await mountAt('')
    expect(selected(/^programs$/i)).toBe(true)
    goto('?type=workouts')
    expect(selected(/^workouts$/i)).toBe(true)
    expect(screen.getByRole('heading', { name: /my workouts/i })).toBeTruthy()
    expect(await screen.findByText('Push day')).toBeTruthy()
    expect(screen.queryByText('Machine Starter')).toBeNull()
  })

  it('?tab=browse appearing shows Browse', async () => {
    const goto = await mountAt('?type=programs')
    expect(selected(/my programs/i)).toBe(true)
    goto('?type=programs&tab=browse')
    expect(selected(/^browse$/i)).toBe(true)
    expect(screen.getByText('BROWSE PROGRAMS CONTENT')).toBeTruthy()
  })

  it('?tab=browse disappearing shows My Programs', async () => {
    const goto = await mountAt('?type=programs&tab=browse')
    expect(selected(/^browse$/i)).toBe(true)
    goto('?type=programs')
    expect(selected(/my programs/i)).toBe(true)
    expect(screen.getByText('Machine Starter')).toBeTruthy()
    expect(screen.queryByText('BROWSE PROGRAMS CONTENT')).toBeNull()
  })

  it('a change of both type and tab at once is followed', async () => {
    const goto = await mountAt('?type=workouts')
    goto('?type=programs&tab=browse')
    expect(selected(/^programs$/i)).toBe(true)
    expect(selected(/^browse$/i)).toBe(true)
  })

  it('a rerender with the same address keeps what the user picked by tapping', async () => {
    const goto = await mountAt('')
    fireEvent.click(tab(/^workouts$/i))
    expect(selected(/^workouts$/i)).toBe(true)
    goto('')
    expect(selected(/^workouts$/i)).toBe(true)
  })

  it('a tapped choice is replaced when the address then changes', async () => {
    const goto = await mountAt('?type=programs')
    fireEvent.click(tab(/^workouts$/i))
    goto('?type=programs&tab=browse')
    expect(selected(/^programs$/i)).toBe(true)
    expect(selected(/^browse$/i)).toBe(true)
  })
})

describe('library view: the switches', () => {
  afterEach(cleanup)
  it('shows Programs with no type', async () => {
    await openLibrary('')
    expect(selected(/^programs$/i)).toBe(true)
    expect(screen.queryByRole('heading', { name: /my workouts/i })).toBeNull()
  })

  it.each(['?type=cardio', '?type=', '?type=WORKOUTS'])('treats %s as Programs', async (search) => {
    await openLibrary(search)
    expect(selected(/^programs$/i)).toBe(true)
    expect(screen.getByText('Machine Starter')).toBeTruthy()
  })

  it('?type=workouts shows Workouts on first render', async () => {
    await openLibrary('?type=workouts')
    expect(selected(/^workouts$/i)).toBe(true)
    expect(await screen.findByText('Push day')).toBeTruthy()
  })

  it('switches from Workouts back to Programs', async () => {
    await openLibrary('?type=workouts')
    fireEvent.click(tab(/^programs$/i))
    expect(selected(/^programs$/i)).toBe(true)
    expect(screen.getByText('Machine Starter')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /my workouts/i })).toBeNull()
  })

  it('?tab=browse opens Browse, and My Programs is one click away', async () => {
    await openLibrary('?type=programs&tab=browse')
    expect(selected(/^browse$/i)).toBe(true)
    expect(screen.getByText('BROWSE PROGRAMS CONTENT')).toBeTruthy()
    fireEvent.click(tab(/my programs/i))
    expect(screen.getByText('Machine Starter')).toBeTruthy()
    expect(screen.queryByText('BROWSE PROGRAMS CONTENT')).toBeNull()
  })

  it('a first-time user also lands on Browse when only the type is given', async () => {
    await openLibrary('?type=programs', { strengthPrograms: [], activeWeekInfo: null, programCount: 0 })
    expect(selected(/^browse$/i)).toBe(true)
  })

  it('a first-time user who asks for Workouts gets Workouts, not Browse', async () => {
    await openLibrary('?type=workouts', { strengthPrograms: [], activeWeekInfo: null, programCount: 0 })
    expect(selected(/^workouts$/i)).toBe(true)
    expect(screen.queryByRole('tab', { name: /browse/i })).toBeNull()
  })

  it('a first-time user who looks at Workouts first still finds Browse under Programs', async () => {
    await openLibrary('?type=workouts', { strengthPrograms: [], activeWeekInfo: null, programCount: 0 })
    fireEvent.click(tab(/^programs$/i))
    expect(selected(/^browse$/i)).toBe(true)
    expect(screen.getByText('BROWSE PROGRAMS CONTENT')).toBeTruthy()
  })

  it('Create New Program is on My Programs only', async () => {
    await openLibrary('?type=programs&tab=browse')
    expect(screen.queryByText(/create new program/i)).toBeNull()
    cleanup()
    await openLibrary('?type=workouts')
    expect(screen.queryByText(/create new program/i)).toBeNull()
    cleanup()
    await openLibrary('')
    expect(screen.getByText(/create new program/i)).toBeTruthy()
  })
})

describe('library view: My Workouts', () => {
  afterEach(cleanup)
  it('lists the saved workouts under the heading, unchanged', async () => {
    await openLibrary('?type=workouts')
    expect(screen.getByRole('heading', { name: /my workouts/i })).toBeTruthy()
    expect(await screen.findByRole('button', { name: /view push day/i })).toBeTruthy()
  })

  it('keeps today\'s empty message and the freestyle button', async () => {
    installFetch({ saved: [] })
    await openLibrary('?type=workouts')
    expect(await screen.findByText(/haven.t saved any workouts yet/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /start a freestyle workout/i })).toBeTruthy()
  })

  it('fetches the same list endpoint as before', async () => {
    const calls = installFetch({ saved: SAVED })
    await openLibrary('?type=workouts')
    await screen.findByText('Push day')
    expect(calls.some((c) => c.url.startsWith('/api/workouts/saved') && c.method === 'GET')).toBe(true)
  })
})

describe('library view: My Programs', () => {
  afterEach(cleanup)
  const A = program({ id: 'a', name: 'Alpha', createdAt: new Date('2026-08-01T12:00:00Z') })
  const B = program({ id: 'b', name: 'Bravo', createdAt: new Date('2026-09-15T12:00:00Z') })
  const C = program({ id: 'c', name: 'Charlie', createdAt: new Date('2026-10-20T12:00:00Z') })
  const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

  it('puts the active program first even when it is the oldest', async () => {
    await openLibrary('', { strengthPrograms: [C, B, { ...A, isActive: true }] })
    expect(names()).toEqual(['Alpha', 'Charlie', 'Bravo'])
  })

  it('lists the others newest first', async () => {
    await openLibrary('', { strengthPrograms: [A, MS, B, C] })
    expect(names()).toEqual(['Machine Starter', 'Charlie', 'Bravo', 'Alpha'])
  })

  it('shows ACTIVE and the week on the active entry only', async () => {
    await openLibrary('', { strengthPrograms: [A, MS, B] })
    expect(screen.getAllByText(/^active$/i)).toHaveLength(1)
    expect(screen.getAllByText(/week \d+ of \d+/i)).toHaveLength(1)
    expect(screen.getByText(/week 2 of 5/i)).toBeTruthy()
  })

  it('with no active program: no badge, no week, no note, all listed', async () => {
    await openLibrary('', { strengthPrograms: [A, B], activeWeekInfo: null })
    expect(names()).toEqual(['Bravo', 'Alpha'])
    expect(screen.queryByText(/^active$/i)).toBeNull()
    expect(screen.queryByText(/week \d+ of/i)).toBeNull()
    expect(screen.queryByText(/no active program/i)).toBeNull()
  })

  it('shows ACTIVE without a week when the week is unknown', async () => {
    await openLibrary('', { strengthPrograms: [MS, A], activeWeekInfo: null })
    expect(screen.getByText(/^active$/i)).toBeTruthy()
    expect(screen.queryByText(/week \d+ of/i)).toBeNull()
  })

  it('does not list a program that is being deleted twice (one row per program)', async () => {
    await openLibrary('', { strengthPrograms: [MS, OS] })
    expect(screen.getAllByText('Old Split')).toHaveLength(1)
  })

  it('an inactive program opens to VIEW, ACTIVATE, EDIT, DUPLICATE and DELETE', async () => {
    await openLibrary('')
    fireEvent.click(screen.getByText('Old Split'))
    expect(screen.getByRole('link', { name: /^view$/i }).getAttribute('href')).toBe('/library/programs/p-os')
    expect(screen.getByRole('button', { name: /activate/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /edit/i }).getAttribute('href')).toBe('/programs/p-os/edit')
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy()
  })

  it('the active program opens to VIEW and EDIT too', async () => {
    await openLibrary('')
    fireEvent.click(screen.getByText('Machine Starter'))
    expect(screen.getByRole('link', { name: /^view$/i }).getAttribute('href')).toBe('/library/programs/p-ms')
    expect(screen.getByRole('link', { name: /edit/i }).getAttribute('href')).toBe('/programs/p-ms/edit')
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeTruthy()
  })

  it('the old active-program strip is gone: no big card with its own links', async () => {
    await openLibrary('')
    expect(screen.queryByRole('link', { name: /^view$/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /go to training|continue|train now/i })).toBeNull()
  })

  it('a program still being added shows its progress and My Programs, from ?cloning=', async () => {
    installFetch({ copy: { status: 'cloning', progress: { currentWeek: 3, totalWeeks: 5 } } })
    const adding = program({ id: 'p-new', name: 'Fresh', copyStatus: 'cloning_week_3' })
    await openLibrary('?type=programs&tab=browse&cloning=p-new', { strengthPrograms: [MS, adding] })
    expect(selected(/my programs/i)).toBe(true)
    expect(await screen.findByText(/cloning 3\/5/i)).toBeTruthy()
  })

  it('when the copy finishes it offers to activate, and tidies the address to the Library', async () => {
    const calls = installFetch({ copy: { status: 'ready' } })
    const added = program({ id: 'p-new', name: 'Fresh' })
    await openLibrary('?type=programs&cloning=p-new', { strengthPrograms: [MS, added] })
    expect(await screen.findByText(/activate program\?/i)).toBeTruthy()
    expect(calls.some((c) => c.url === '/api/programs/p-new/copy-status')).toBe(true)
    expect(window.location.pathname).not.toBe('/programs')
  })
})

describe('library view: links into the Library', () => {
  afterEach(cleanup)
  it('the program completion modal sends "Choose New Program" to the Library programs', async () => {
    installFetch()
    const mod = (await load('@/components/ProgramCompletionModal')) as { ProgramCompletionModal: ComponentType<Record<string, unknown>> }
    render(createElement(mod.ProgramCompletionModal, { open: true, programId: 'p1', onClose: vi.fn() }))
    fireEvent.click(await screen.findByRole('button', { name: /choose new program/i }))
    expect(nav.push).toHaveBeenCalledTimes(1)
    const { path, params } = parse(nav.push.mock.calls[0][0] as string)
    expect(path).toBe('/library')
    expect(params.type).toEqual(['programs'])
  })

  it('adding a community program sends the user to the Library with ?cloning=', async () => {
    installFetch({ addedProgramId: 'p-77' })
    const mod = (await load('@/components/community/CommunityProgramCard')) as { default: ComponentType<Record<string, unknown>> }
    render(
      createElement(mod.default, {
        program: {
          id: 'cp1', name: 'Community Plan', description: 'A plan', programType: 'strength', authorUserId: 'x',
          displayName: 'X', publishedAt: new Date('2026-10-01T12:00:00Z'), weekCount: 4, workoutCount: 12,
          exerciseCount: 40, goals: [], level: null, durationDisplay: null, targetDaysPerWeek: 3,
          equipmentNeeded: [], focusAreas: [],
        },
        currentUserId: 'u1',
        hasAccess: true,
        maxPrograms: 3,
      })
    )
    fireEvent.click(screen.getByRole('button', { name: /add to my programs/i }))
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1))
    expect(parse(nav.push.mock.calls[0][0] as string)).toEqual({ path: '/library', params: { type: ['programs'], cloning: ['p-77'] } })
  })
})

describe('program detail back link', () => {
  afterEach(cleanup)
  it('reads Library and goes to the Library programs, not Training', async () => {
    const mod = (await load('@/components/programs/ProgramBackLink')) as { default: ComponentType }
    render(createElement(mod.default))
    const link = screen.getByRole('link', { name: /library/i })
    expect(link.getAttribute('href')).toBe('/library?type=programs')
    expect(screen.queryByRole('link', { name: /training/i })).toBeNull()
  })
})
