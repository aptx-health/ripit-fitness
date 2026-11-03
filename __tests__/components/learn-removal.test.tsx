/**
 * Progress S1: Learn is unlinked (work item 107).
 * Spec: features/analytics/weekly-report.feature, "Old Learn links go to
 * Progress" and "The beginner primer has no Learn links". (The nav itself is in
 * nav-active-tab.test.tsx and library.steps.ts.)
 *
 * /learn, /learn/<anything> and /learn/collections/<id> end up on /progress. Either
 * way of doing it passes: a `redirects()` entry in next.config.ts whose destination
 * is /progress and whose source matches the path, or the old page redirecting
 * with next/navigation `redirect('/progress')`. The Learn data and admin CMS are
 * not touched by this item.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  permanentRedirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: 'u1', email: 'a@b.c', role: 'user' }, error: null }),
}))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: null, isLoading: false, updateSettings: vi.fn(async () => {}) }),
}))

afterEach(cleanup)

// --- redirects ----------------------------------------------------------------
/** Sources of next.config.ts redirects whose destination is /progress, as RegExps. */
function configRedirectsToProgress(): RegExp[] {
  const text = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8')
  const out: RegExp[] = []
  for (const block of text.match(/\{[^{}]*\}/g) ?? []) {
    const source = block.match(/source:\s*['"`]([^'"`]+)['"`]/)?.[1]
    const destination = block.match(/destination:\s*['"`]([^'"`]+)['"`]/)?.[1]
    if (!source || destination !== '/progress') continue
    const pattern = source
      .replace(/\/:[A-Za-z]+\*/g, '(?:/.*)?')
      .replace(/\/:[A-Za-z]+\+/g, '/.+')
      .replace(/:[A-Za-z]+/g, '[^/]+')
    out.push(new RegExp(`^${pattern}/?$`))
  }
  return out
}

async function pageRedirectsToProgress(path: string): Promise<boolean> {
  const spec =
    path === '/learn'
      ? ['@/app/(app)/learn/page', {}]
      : path.startsWith('/learn/collections/')
        ? ['@/app/(app)/learn/collections/[id]/page', { id: path.split('/').pop() }]
        : ['@/app/(app)/learn/[slug]/page', { slug: path.split('/').pop() }]
  let mod: { default: (props: unknown) => unknown }
  try {
    mod = (await load(spec[0] as string)) as typeof mod
  } catch {
    return false
  }
  try {
    const out = mod.default({ params: Promise.resolve(spec[1]), searchParams: Promise.resolve({}) })
    if (out instanceof Promise) await out
    return false
  } catch (e) {
    return e instanceof Error && e.message === 'NEXT_REDIRECT /progress'
  }
}

async function landsOnProgress(path: string): Promise<boolean> {
  if (configRedirectsToProgress().some((re) => re.test(path))) return true
  return pageRedirectsToProgress(path)
}

describe('Old Learn links go to Progress', () => {
  it.each(['/learn', '/learn/some-article', '/learn/choosing-the-right-weight', '/learn/collections/c1'])(
    'opening %s lands on /progress',
    async (path) => {
      expect(await landsOnProgress(path)).toBe(true)
    },
  )
})

// --- primer -------------------------------------------------------------------
describe('The beginner primer has no Learn links', () => {
  it('no page of the wizard links to a /learn page, and the four pages are all still there', async () => {
    const { BeginnerPrimerWizard } = (await load('@/components/features/training/BeginnerPrimerWizard')) as {
      BeginnerPrimerWizard: (p: { open: boolean; onDismiss: () => void }) => React.ReactElement | null
    }
    render(createElement(BeginnerPrimerWizard, { open: true, onDismiss: vi.fn() }))

    const titles: string[] = []
    for (let page = 0; page < 4; page++) {
      titles.push(screen.getByRole('heading', { level: 3 }).textContent ?? '')
      const hrefs = screen.queryAllByRole('link').map((a) => a.getAttribute('href') ?? '')
      expect(hrefs.filter((h) => h.startsWith('/learn')), `page ${page + 1}`).toEqual([])
      expect(document.querySelector('a[href*="/learn"]')).toBeNull()
      expect(screen.queryByText(/read more/i), `page ${page + 1}`).toBeNull()
      if (page < 3) fireEvent.click(screen.getByRole('button', { name: /next/i }))
    }
    expect(titles).toEqual(['THE APP DOES THE THINKING', 'GO LIGHTER THAN YOU THINK', 'YOU BELONG HERE', 'YOUR BODY WILL TALK TO YOU'])
    expect(screen.getByRole('button', { name: /let.s go/i })).toBeTruthy()
  })
})
