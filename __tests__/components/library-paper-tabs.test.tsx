/**
 * UI3: the Library's paper tabs follow the address. Workouts | Programs drive
 * `?type=`, and My Programs | Browse inside the Programs folder drive `?tab=`.
 * A click or arrow key writes the address (history.replaceState); an address
 * change from outside (back/forward, a link) moves the tabs; unknown values
 * fall back to the defaults. Spec: initiatives/ui-audit/spec.md ("UI3").
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFetch, load, nav, SAVED, viewProps } from '../features/training-library/library-support'

vi.mock('next/navigation', async () => {
  const { nav } = await import('../features/training-library/library-support')
  return {
    useRouter: () => ({ push: nav.push, refresh: nav.refresh, replace: nav.replace, back: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => nav.pathname,
    useSearchParams: () => new URLSearchParams(nav.search),
  }
})
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}))
vi.mock('@/components/community/CommunityProgramsView', async () => {
  const { createElement } = await import('react')
  return { default: () => createElement('div', null, 'BROWSE PROGRAMS CONTENT') }
})

type Props = ReturnType<typeof viewProps> & { savedWorkoutCount?: number }

let replaceState: ReturnType<typeof vi.spyOn>

async function openAt(search: string, over: Record<string, unknown> = {}) {
  nav.search = search
  window.history.pushState(null, '', `/library${search}`)
  replaceState = vi.spyOn(window.history, 'replaceState')
  const View = ((await load('@/components/library/LibraryView')) as { default: ComponentType<Props> }).default
  const view = render(createElement(View, viewProps(over) as Props))
  /** The address changes from outside, as back/forward or a link would. */
  const navigate = (next: string) => {
    nav.search = next
    window.history.pushState(null, '', `/library${next}`)
    view.rerender(createElement(View, viewProps(over) as Props))
  }
  return { navigate }
}

const tablist = (name: string) => screen.getByRole('tablist', { name })
const tab = (list: string, name: RegExp) => within(tablist(list)).getByRole('tab', { name })
const isSelected = (list: string, name: RegExp) => tab(list, name).getAttribute('aria-selected') === 'true'
/** The search string of the last address the view wrote. */
const written = () => {
  const call = replaceState.mock.calls.at(-1)
  return call ? new URL(String(call[2]), window.location.href).search : null
}

beforeEach(() => {
  installFetch({ saved: SAVED })
})
afterEach(() => {
  cleanup()
  replaceState?.mockRestore()
})

describe('Library: paper tabs, not SegmentedControls', () => {
  it('shows Workouts and Programs as tabs in a tablist', async () => {
    await openAt('')
    expect(within(tablist('Library content')).getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual([
      'Workouts',
      'Programs',
    ])
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('puts My Programs and Browse in the Programs folder', async () => {
    await openAt('?type=programs')
    const panel = screen.getByRole('tabpanel', { name: /^programs$/i })
    expect(within(panel).getByRole('tablist', { name: 'Programs view' })).toBeTruthy()
    expect(within(tablist('Programs view')).getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual([
      'My Programs',
      'Browse',
    ])
  })

  it('every tab controls a panel that exists and is labelled by it', async () => {
    await openAt('?type=programs')
    for (const t of screen.getAllByRole('tab')) {
      const panel = document.getElementById(t.getAttribute('aria-controls') ?? '')
      expect(panel?.getAttribute('role')).toBe('tabpanel')
      expect(panel?.getAttribute('aria-labelledby')).toBe(t.id)
    }
  })

  it('has no visible "MY WORKOUTS" label over the list', async () => {
    await openAt('?type=workouts')
    const heading = screen.getByRole('heading', { name: /my workouts/i })
    expect(heading.className).toContain('sr-only')
  })
})

describe('Library: clicking a tab writes the address', () => {
  it('Workouts writes ?type=workouts and drops ?tab', async () => {
    await openAt('?type=programs&tab=browse')
    fireEvent.click(tab('Library content', /^workouts$/i))
    expect(isSelected('Library content', /^workouts$/i)).toBe(true)
    const params = new URLSearchParams(written() ?? '')
    expect(params.get('type')).toBe('workouts')
    expect(params.has('tab')).toBe(false)
  })

  it('Programs writes ?type=programs', async () => {
    await openAt('?type=workouts')
    fireEvent.click(tab('Library content', /^programs$/i))
    expect(new URLSearchParams(written() ?? '').get('type')).toBe('programs')
    expect(screen.getByText('Machine Starter')).toBeTruthy()
  })

  it('Browse writes ?tab=browse, and My Programs removes it', async () => {
    await openAt('?type=programs')
    fireEvent.click(tab('Programs view', /^browse$/i))
    expect(new URLSearchParams(written() ?? '').get('tab')).toBe('browse')
    expect(screen.getByText('BROWSE PROGRAMS CONTENT')).toBeTruthy()
    fireEvent.click(tab('Programs view', /my programs/i))
    expect(new URLSearchParams(written() ?? '').has('tab')).toBe(false)
    expect(screen.getByText('Machine Starter')).toBeTruthy()
  })

  it('arrow keys switch the tab and write the address too', async () => {
    await openAt('?type=programs')
    const programs = tab('Library content', /^programs$/i)
    programs.focus()
    fireEvent.keyDown(programs, { key: 'ArrowLeft' })
    expect(isSelected('Library content', /^workouts$/i)).toBe(true)
    expect(document.activeElement).toBe(tab('Library content', /^workouts$/i))
    expect(new URLSearchParams(written() ?? '').get('type')).toBe('workouts')
  })

  it('keeps other query parameters', async () => {
    await openAt('?type=programs&from=training')
    fireEvent.click(tab('Library content', /^workouts$/i))
    expect(new URLSearchParams(written() ?? '').get('from')).toBe('training')
  })
})

describe('Library: unknown values fall back', () => {
  it.each(['?type=cardio', '?type=', '?type=Programs&tab=x'])('%s shows Programs, My Programs', async (search) => {
    await openAt(search)
    expect(isSelected('Library content', /^programs$/i)).toBe(true)
    expect(isSelected('Programs view', /my programs/i)).toBe(true)
  })

  it('an unknown ?tab= for a first-time user falls back to Browse', async () => {
    await openAt('?type=programs&tab=nope', { strengthPrograms: [], activeWeekInfo: null, programCount: 0 })
    expect(isSelected('Programs view', /^browse$/i)).toBe(true)
  })

  it('a value matching no tab never leaves the strip unreachable by keyboard', async () => {
    await openAt('?type=cardio')
    const tabs = within(tablist('Library content')).getAllByRole('tab')
    expect(tabs.filter((t) => t.tabIndex === 0)).toHaveLength(1)
  })
})

describe('Library: back and forward follow the address', () => {
  it('moving back from Browse to Workouts shows Workouts', async () => {
    const { navigate } = await openAt('?type=workouts')
    navigate('?type=programs&tab=browse')
    expect(isSelected('Library content', /^programs$/i)).toBe(true)
    expect(isSelected('Programs view', /^browse$/i)).toBe(true)
    navigate('?type=workouts')
    expect(isSelected('Library content', /^workouts$/i)).toBe(true)
    expect(screen.queryByRole('tablist', { name: 'Programs view' })).toBeNull()
  })

  it('a click, then an outside change of address: the address wins', async () => {
    const { navigate } = await openAt('?type=programs')
    fireEvent.click(tab('Library content', /^workouts$/i))
    navigate('?type=programs&tab=browse')
    expect(isSelected('Library content', /^programs$/i)).toBe(true)
    expect(isSelected('Programs view', /^browse$/i)).toBe(true)
  })
})

describe('Library: the Workouts count chip', () => {
  it('shows the server count before the list loads, without changing the tab name', async () => {
    installFetch({ saved: [] })
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    await openAt('?type=programs', { savedWorkoutCount: 3 })
    const workouts = tab('Library content', /^workouts$/i)
    expect(workouts.textContent?.replace(/\s+/g, ' ').trim()).toBe('Workouts 3')
  })

  it('follows the list once it has loaded', async () => {
    await openAt('?type=workouts', { savedWorkoutCount: 3 })
    await screen.findByText('Push day')
    await act(async () => {})
    expect(tab('Library content', /^workouts$/i).textContent?.replace(/\s+/g, ' ').trim()).toBe('Workouts 1')
  })

  it('has no chip with no saved workouts', async () => {
    await openAt('?type=programs', { savedWorkoutCount: 0 })
    expect(tab('Library content', /^workouts$/i).textContent?.trim()).toBe('Workouts')
  })
})
