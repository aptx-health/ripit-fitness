/**
 * TL2: the bottom nav and the desktop header highlight the right tab on every
 * page. /library/programs/* highlights Training (until TL3 adds a Library tab).
 *
 * Seams:
 *   lib/nav/active-tab.ts   isTabActive(tabHref, pathname) -> boolean
 *     the one rule both navs use. Tab hrefs today: /training, /programs,
 *     /learn, /settings.
 *   components/BottomNav.tsx   active tab link has aria-current="page"
 *     (already does), others have none.
 *   components/Header.tsx   same: the active nav link gets aria-current="page"
 *     (new; today it only changes classes).
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

const TABS = ['/training', '/programs', '/learn', '/settings']
async function activeTabs(pathname: string) {
  const out: string[] = []
  for (const t of TABS) if (await isTabActive(t, pathname)) out.push(t)
  return out
}

describe('isTabActive', () => {
  it.each([
    ['/training', '/training'],
    ['/training', '/training/adhoc/abc123'],
    ['/programs', '/programs'],
    ['/programs', '/programs/new'],
    ['/programs', '/programs/p1/edit'],
    ['/learn', '/learn/topic'],
    ['/settings', '/settings'],
  ])('%s is active on %s', async (tab, path) => {
    expect(await isTabActive(tab, path)).toBe(true)
  })

  it.each([
    '/library/programs/p1',
    '/library/programs/p1/anything',
  ])('Training is the only active tab on %s', async (path) => {
    expect(await activeTabs(path)).toEqual(['/training'])
  })

  it('exactly one tab is active on each ordinary page', async () => {
    for (const [path, tab] of [
      ['/training', '/training'],
      ['/programs', '/programs'],
      ['/learn', '/learn'],
      ['/settings', '/settings'],
    ]) {
      expect(await activeTabs(path)).toEqual([tab])
    }
  })

  it('Programs is not active on a program detail page', async () => {
    expect(await isTabActive('/programs', '/library/programs/p1')).toBe(false)
  })

  it('no tab is active on an unrelated page', async () => {
    expect(await activeTabs('/admin/proposals')).toEqual([])
  })
})

describe('navs', () => {
  beforeEach(() => {
    h.pathname = '/library/programs/p1'
  })
  afterEach(cleanup)

  it('the bottom nav marks Training current on a program detail page, and only Training', async () => {
    const BottomNav = ((await load('@/components/BottomNav')) as { default: ComponentType }).default
    render(createElement(BottomNav))
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['Training'])
  })

  it('the bottom nav still marks Programs on /programs', async () => {
    h.pathname = '/programs'
    const BottomNav = ((await load('@/components/BottomNav')) as { default: ComponentType }).default
    render(createElement(BottomNav))
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['Programs'])
  })

  it('the header marks Training current on a program detail page, and only Training', async () => {
    const Header = ((await load('@/components/Header')) as { default: ComponentType<{ userEmail: string }> }).default
    render(createElement(Header, { userEmail: 'a@b.c' }))
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['Training'])
  })

  it('the header marks Programs on /programs', async () => {
    h.pathname = '/programs/new'
    const Header = ((await load('@/components/Header')) as { default: ComponentType<{ userEmail: string }> }).default
    render(createElement(Header, { userEmail: 'a@b.c' }))
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['Programs'])
  })
})
