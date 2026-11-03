/**
 * Per-lift page: the loading skeleton (work item 129). Spec: features/analytics/lift-page.feature,
 * "A skeleton shows at once".
 *
 *   - LiftSkeleton ([data-lift-skeleton]) has the page's parts: back link row, title, chips,
 *     the chart folder (tiles, chart, the four ranges), Records and Sessions folders. Readers hear
 *     only a status "Loading…"; the placeholders are hidden from them. No heading, no buttons or
 *     links of its own (nothing to tap until the page is there). The pulse is motion-safe only.
 *   - LiftView shows it while loading (with its real back link), not a plain "Loading…" line,
 *     and again when the lift changes (a chip switch); the real page replaces it.
 *   - app/(app)/progress/lift/[id]/loading.tsx renders it at once on navigation.
 */

import { act, cleanup, render, screen } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ gate: null as null | Promise<void> }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress/lift/d-squat',
  useSearchParams: () => new URLSearchParams('week=2026-10-12'),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const lift = (name: string) => ({
  name,
  weightUnit: 'lbs',
  isBodyweight: false,
  sessions: [{ completionId: 'a', date: '2026-10-30T18:00:00.000Z', sets: [{ weight: 200, reps: 5 }], e1rm: 233.3, topSet: { weight: 200, reps: 5 }, avgRpe: null }],
  records: [],
  weeklySets: [],
  pinned: [],
})

beforeEach(() => {
  h.gate = null
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      if (h.gate) await h.gate
      const name = String(input).includes('d-bench') ? 'Bench Press' : 'Back Squat'
      return { ok: true, status: 200, json: async () => ({ success: true, lift: lift(name) }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const skeleton = () => document.querySelector('[data-lift-skeleton]')
const gate = () => {
  let release: () => void = () => {}
  h.gate = new Promise<void>((r) => {
    release = r
  })
  return () => release()
}
const view = async () => ((await import('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> }).default

describe('LiftSkeleton', () => {
  it('has the page parts, a status for readers, and nothing to tap', async () => {
    const Skeleton = ((await import('@/components/features/progress/LiftSkeleton')) as { default: ComponentType }).default
    render(createElement(Skeleton))
    const root = skeleton() as HTMLElement
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Loading…')
    expect(root.textContent).toMatch(/Records/)
    expect(root.textContent).toMatch(/Sessions/)
    expect(root.textContent).toMatch(/3M.*6M.*1Y.*All/)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    expect(root.querySelectorAll('button, a')).toHaveLength(0)
    // every placeholder and label is hidden from readers
    const parts = Array.from(root.querySelectorAll('[class*="animate-pulse"], [class*="uppercase"]'))
    expect(parts.length).toBeGreaterThan(10)
    expect(parts.every((p) => p.closest('[aria-hidden="true"]'))).toBe(true)
  })

  it('pulses only when motion is allowed', async () => {
    const Skeleton = ((await import('@/components/features/progress/LiftSkeleton')) as { default: ComponentType }).default
    render(createElement(Skeleton))
    const classes = Array.from((skeleton() as HTMLElement).querySelectorAll('[class]')).map((e) => e.getAttribute('class') ?? '')
    expect(classes.some((c) => /(^|\s)motion-safe:animate-pulse(\s|$)/.test(c))).toBe(true)
    expect(classes.some((c) => /(^|\s)animate-pulse(\s|$)/.test(c))).toBe(false)
  })
})

describe('LiftView while loading', () => {
  it('shows the skeleton with the real back link, not a "Loading…" line, then the page', async () => {
    const release = gate()
    const View = await view()
    render(createElement(View, { exerciseDefinitionId: 'd-squat' }))
    expect(skeleton()).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Progress' }).getAttribute('href')).toBe('/progress?week=2026-10-12')
    expect(Array.from(document.querySelectorAll('p')).filter((p) => p.textContent === 'Loading…' && !p.className.includes('sr-only'))).toHaveLength(0)
    release()
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Back Squat')
    expect(skeleton()).toBeNull()
  })

  it('shows it again when a chip switches to another lift', async () => {
    const View = await view()
    const { rerender } = render(createElement(View, { exerciseDefinitionId: 'd-squat' }))
    await screen.findByRole('heading', { level: 1 })
    const release = gate()
    rerender(createElement(View, { exerciseDefinitionId: 'd-bench' }))
    await act(async () => {})
    expect(skeleton()).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    release()
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Bench Press')
  })
})

describe('the route', () => {
  it('loading.tsx renders the skeleton at once', async () => {
    const Loading = ((await import('@/app/(app)/progress/lift/[id]/loading')) as { default: ComponentType }).default
    render(createElement(Loading))
    expect(skeleton()).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Loading…')
  })
})
