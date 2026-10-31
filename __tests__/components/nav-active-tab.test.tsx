/**
 * The bottom nav and the desktop header highlight the right tab on every page.
 * TL3: Library replaces Programs, and /library/* (including /library/programs/*)
 * highlights Library, not Training.
 *
 * Seams:
 *   lib/nav/active-tab.ts   isTabActive(tabHref, pathname) -> boolean
 *     the one rule both navs use. Tab hrefs: /training, /library, /learn,
 *     /settings. Library is active on /library, everything under it, and on
 *     /programs/new and /programs/<id>/edit (which stay where they are).
 *   components/BottomNav.tsx   active tab link has aria-current="page"
 *     (already does), others have none.
 *   components/Header.tsx   same: the active nav link gets aria-current="page"
 *     (set in TL2).
 *   Both navs list Training, Library, Learn, Settings, with the Workout
 *   (Quick actions) button between Library and Learn in the bottom nav, and
 *   no Programs tab.
 */

import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({ pathname: '/training' }))
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  useDraftWorkout: () => ({ activeDraft: null, refreshDraft: vi.fn(), clearDraft: vi.fn() }),
}))
vi.mock('@/components/QuickActionSheet', () => ({ default: () => null }))
vi.mock('@/components/ThemeSelector', () => ({ ThemeSelector: () => null }))
vi.mock('next/image', () => ({ default: () => null }))

async function isTabActive(href: string, pathname: string) {
  const mod = (await load('@/lib/nav/active-tab')) as { isTabActive: (h: string, p: string) => boolean }
  return mod.isTabActive(href, pathname)
}

const TABS = ['/training', '/library', '/learn', '/settings']
async function activeTabs(pathname: string) {
  const out: string[] = []
  for (const t of TABS) if (await isTabActive(t, pathname)) out.push(t)
  return out
}

describe('isTabActive', () => {
  it.each([
    ['/training', '/training'],
    ['/training', '/training/adhoc/abc123'],
    ['/training', '/suggestions'],
    ['/training', '/suggestions/s1'],
    ['/library', '/library'],
    ['/library', '/library/programs/p1'],
    ['/library', '/library/programs/p1/anything'],
    ['/library', '/programs/new'],
    ['/library', '/programs/p1/edit'],
    ['/learn', '/learn/topic'],
    ['/settings', '/settings'],
  ])('%s is active on %s', async (tab, path) => {
    expect(await isTabActive(tab, path)).toBe(true)
  })

  it.each([
    '/library/programs/p1',
    '/library/programs/p1/anything',
    '/programs/new',
    '/programs/p1/edit',
  ])('Library is the only active tab on %s', async (path) => {
    expect(await activeTabs(path)).toEqual(['/library'])
  })

  it.each(['/suggestions', '/suggestions/s1'])('Training is the only active tab on %s', async (path) => {
    expect(await activeTabs(path)).toEqual(['/training'])
  })

  it('Training is not active on a program detail page', async () => {
    expect(await isTabActive('/training', '/library/programs/p1')).toBe(false)
  })

  it('exactly one tab is active on each ordinary page', async () => {
    for (const [path, tab] of [
      ['/training', '/training'],
      ['/library', '/library'],
      ['/learn', '/learn'],
      ['/settings', '/settings'],
    ]) {
      expect(await activeTabs(path)).toEqual([tab])
    }
  })

  it('there is no Programs tab any more: Library is the one that is active on /library', async () => {
    expect(await isTabActive('/programs', '/library')).toBe(false)
  })

  it('no tab is active on an unrelated page', async () => {
    expect(await activeTabs('/admin/proposals')).toEqual([])
  })
})

const labels = (links: HTMLElement[]) => links.map((a) => a.textContent)
const current = () => screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')

async function bottomNav() {
  const BottomNav = ((await load('@/components/BottomNav')) as { default: ComponentType }).default
  return render(createElement(BottomNav))
}
async function header() {
  const Header = ((await load('@/components/Header')) as { default: ComponentType<{ userEmail: string }> }).default
  return render(createElement(Header, { userEmail: 'a@b.c' }))
}

describe('navs', () => {
  beforeEach(() => {
    h.pathname = '/library/programs/p1'
  })
  afterEach(cleanup)

  it('the bottom nav shows Training, Library, Workout, Learn and Settings, with no Programs', async () => {
    await bottomNav()
    const links = screen.getAllByRole('link')
    expect(labels(links)).toEqual(['Training', 'Library', 'Learn', 'Settings'])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/training', '/library', '/learn', '/settings'])
    const workout = screen.getByRole('button', { name: /quick actions/i })
    expect(links[1].compareDocumentPosition(workout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(workout.compareDocumentPosition(links[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the header shows Training, Library and Learn, with no Programs', async () => {
    await header()
    const links = screen.getAllByRole('link').filter((a) => ['Training', 'Library', 'Programs', 'Learn'].includes(a.textContent ?? ''))
    expect(labels(links)).toEqual(['Training', 'Library', 'Learn'])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/training', '/library', '/learn'])
  })

  it.each([
    '/library',
    '/library/programs/p1',
    '/programs/new',
    '/programs/p1/edit',
  ])('the bottom nav marks Library current on %s, and only Library', async (path) => {
    h.pathname = path
    await bottomNav()
    expect(labels(current())).toEqual(['Library'])
  })

  it.each([
    '/library',
    '/library/programs/p1',
    '/programs/new',
  ])('the header marks Library current on %s, and only Library', async (path) => {
    h.pathname = path
    await header()
    expect(labels(current())).toEqual(['Library'])
  })

  it.each(['/suggestions', '/suggestions/s1'])('the bottom nav marks Training current on %s, and only Training', async (path) => {
    h.pathname = path
    await bottomNav()
    expect(labels(current())).toEqual(['Training'])
  })

  it.each(['/suggestions', '/suggestions/s1'])('the header marks Training current on %s, and only Training', async (path) => {
    h.pathname = path
    await header()
    expect(labels(current())).toEqual(['Training'])
  })

  it('the bottom nav still marks Training on /training', async () => {
    h.pathname = '/training'
    await bottomNav()
    expect(labels(current())).toEqual(['Training'])
  })

  it('the header still marks Training on /training/adhoc/x', async () => {
    h.pathname = '/training/adhoc/x'
    await header()
    expect(labels(current())).toEqual(['Training'])
  })
})
