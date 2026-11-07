/**
 * Work 154, reworked by work 155: Workouts groups as distinct sections
 * (features/workout-library/row-panel.feature, "Groups are distinct sections
 * (option F)" and "Older stays a dropdown").
 *
 *   SavedWorkoutsList: each group is a region (New, Pinned, Recent, Older):
 *   a header, then its rows in their own bordered box. The header's parts, in
 *   order: a filled square with the count, the name in the group's colour and
 *   a line in that colour (flex-1, to the right edge). Its name is the group and
 *   its count, e.g. "Pinned (1)". Colours are theme tokens, one per group. No
 *   tab shape (no clip-path). Older's header is one 48px button with a
 *   chevron, closed until tapped.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/library',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
  ToastProvider: ({ children }: { children: unknown }) => children,
}))

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()
const item = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  notes: null,
  exerciseCount: 3,
  lastUsedAt: null,
  createdAt: ago(2),
  pinnedAt: null,
  origin: 'session',
  archivedAt: null,
  dismissedAt: null,
  ...over,
})
const ITEMS = [
  item('n', 'Machine Upper', { origin: 'agent' }),
  item('p', 'Mobility', { pinnedAt: ago(1) }),
  item('r1', 'Upper Body'),
  item('r2', 'Leg Day', { lastUsedAt: ago(5) }),
  item('o1', 'Old Legs', { createdAt: ago(90) }),
  item('o2', 'Old Arms', { createdAt: ago(120) }),
]
const GROUPS = [
  ['New', 1],
  ['Pinned', 1],
  ['Recent', 2],
  ['Older', 2],
] as const

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ saved: ITEMS }) }))
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function renderList() {
  const mod = (await load('@/components/features/saved-workouts/SavedWorkoutsList')) as { default: ComponentType }
  render(createElement(mod.default))
  await screen.findByText('Upper Body')
}
const region = (name: string) => screen.getByRole('region', { name })
/** The group's header: its heading, or Older's fold button. */
const headerOf = (name: string) =>
  within(region(name)).queryByRole('heading') ?? within(region(name)).getByRole('button', { name: /^older/i })
/** The header's square, name and line, in order. */
const partsOf = (name: string) => {
  const [square, title, line] = Array.from(headerOf(name).children) as HTMLElement[]
  return { square, title, line }
}
const token = (el: HTMLElement, prefix: 'bg' | 'text') =>
  el.className.split(/\s+/).find((c) => c.startsWith(`${prefix}-`) && !/^text-(xs|sm|base|left)$/.test(c)) ?? ''
const boxOf = (name: string) =>
  Array.from(region(name).children).find((el) => /\bborder-2\b/.test(el.className)) as HTMLElement | undefined
const fold = () => screen.getByRole('button', { name: /^older/i })
const RAW = /(#[0-9a-f]{3,6}|rgb\(|(bg|text)-(red|blue|green|yellow|orange|amber|gray|zinc|slate)-)/i

describe('groups are distinct sections', () => {
  it("each group's rows sit in their own bordered box under the header, not one shared grid", async () => {
    await renderList()
    fireEvent.click(fold())
    const boxes = GROUPS.map(([name]) => boxOf(name) as HTMLElement)
    for (const box of boxes) expect(box).toBeTruthy()
    expect(new Set(boxes).size).toBe(4)
    for (const [name] of GROUPS)
      expect(headerOf(name).compareDocumentPosition(boxOf(name) as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(boxOf('Recent') as HTMLElement).getByText('Upper Body')).toBeTruthy()
    expect(within(boxOf('Recent') as HTMLElement).queryByText('Mobility')).toBeNull()
    expect(within(boxOf('Pinned') as HTMLElement).getByText('Mobility')).toBeTruthy()
    expect(within(boxOf('Older') as HTMLElement).getByText('Old Legs')).toBeTruthy()
  })

  it('the groups have space between them', async () => {
    await renderList()
    const container = region('New').parentElement as HTMLElement
    expect(region('Pinned').parentElement).toBe(container)
    expect(container.className).toMatch(/\bspace-y-\d/)
    expect(container.className).not.toMatch(/\bdivide-y\b/)
  })

  it('each header is a count square, the name, then a line to the right edge; named e.g. "Pinned (1)"', async () => {
    await renderList()
    for (const [name, n] of GROUPS) {
      const { square, title, line } = partsOf(name)
      expect(headerOf(name).getAttribute('aria-label')).toBe(`${name} (${n})`)
      expect(square.textContent).toBe(String(n))
      expect(token(square, 'bg')).not.toBe('')
      expect(title.textContent).toBe(name)
      expect(line.textContent).toBe('')
      expect(line.className).toMatch(/\bflex-1\b/)
      expect(token(line, 'bg')).not.toBe('')
    }
    expect(screen.getByRole('heading', { name: 'Pinned (1)' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Recent (2)' })).toBeTruthy()
  })

  it('there is no tab shape: no slanted clip and no tab role', async () => {
    await renderList()
    for (const [name] of GROUPS) {
      for (const el of [headerOf(name), ...Array.from(headerOf(name).querySelectorAll<HTMLElement>('*'))]) {
        expect(el.style.clipPath).toBe('')
        expect(el.getAttribute('role')).not.toBe('tab')
      }
    }
    expect(screen.queryAllByRole('tab')).toEqual([])
  })

  it('each group has its own colour from theme tokens: square, name and line agree', async () => {
    await renderList()
    const squares = GROUPS.map(([name]) => token(partsOf(name).square, 'bg'))
    expect(new Set(squares).size).toBe(4)
    for (const f of squares) expect(f).toMatch(/^bg-(accent|secondary|primary|muted|warning|success)$/)
    for (const [name] of GROUPS) {
      const { square, title, line } = partsOf(name)
      // The square's text is its fill's foreground, so it reads in every theme.
      expect(token(square, 'text')).toMatch(/foreground$/)
      const all = [square, title, line].map((el) => el.className).join(' ')
      // No raw colours: tokens only, so E-INK and every theme restyle them.
      expect(all).not.toMatch(RAW)
      if (name !== 'Older') {
        const colour = token(square, 'bg').replace(/^bg-/, '')
        expect(token(title, 'text')).toBe(`text-${colour}`)
        expect(token(line, 'bg')).toBe(`bg-${colour}`)
      }
    }
  })
})

describe('Older stays a dropdown', () => {
  it('its header (count square, Older, a chevron, the line) is one 48px button, closed until tapped', async () => {
    await renderList()
    expect(fold().getAttribute('aria-expanded')).toBe('false')
    expect(fold().getAttribute('aria-label')).toBe('Older (2)')
    const { square, title, line } = partsOf('Older')
    expect(square.textContent).toBe('2')
    expect(title.textContent).toBe('Older')
    expect(title.querySelector('svg.lucide-chevron-down')).not.toBeNull()
    expect(line.className).toMatch(/\bflex-1\b/)
    expect(fold().className).toMatch(/\bmin-h-12\b/)
    expect(within(region('Older')).getAllByRole('button')).toHaveLength(1)
    expect(boxOf('Older')).toBeUndefined()
    expect(screen.queryByText('Old Legs')).toBeNull()
  })

  it('tapping it opens its rows in a box like the others; tapping again closes it', async () => {
    await renderList()
    fireEvent.click(fold())
    expect(fold().getAttribute('aria-expanded')).toBe('true')
    expect((boxOf('Older') as HTMLElement).className).toBe((boxOf('Recent') as HTMLElement).className)
    expect(within(boxOf('Older') as HTMLElement).getByText('Old Arms')).toBeTruthy()
    fireEvent.click(fold())
    expect(fold().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Old Legs')).toBeNull()
  })
})
