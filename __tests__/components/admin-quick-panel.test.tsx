/**
 * Admin quick panel (features/admin/admin-quick-panel.feature): an edge tab
 * and side drawer for admins only, starting with touch indicators for
 * recording tutorials. Each describe block is one scenario.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminQuickPanel from '@/components/features/admin-quick-panel/AdminQuickPanel'
import { RING_FADE_MS, TOUCH_LAYER_Z } from '@/components/features/admin-quick-panel/TouchIndicators'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/radix/dialog'
import { QUICK_PANEL_PREFS_KEY } from '@/lib/admin/quick-panel-prefs'

// --- (app) layout seams -------------------------------------------------------

const h = vi.hoisted(() => ({ role: 'admin' }))

vi.mock('next/navigation', () => ({ redirect: vi.fn(), usePathname: () => '/training' }))
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: 'u1', email: 'a@test.com', role: h.role }, error: null }),
}))
vi.mock('@/lib/auth/waiver', () => ({ hasCurrentWaiver: async () => true }))
vi.mock('@/lib/db', () => ({ prisma: {} }))
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  DraftWorkoutProvider: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/components/AppScrollContainer', () => ({
  default: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/components/BottomNav', () => ({ default: () => null }))
vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/components/features/FeedbackButton', () => ({ default: () => null }))
vi.mock('@/components/features/PwaInstallButton', () => ({ PwaInstallButton: () => null }))
vi.mock('@/components/features/SessionContextTracker', () => ({ SessionContextTracker: () => null }))
vi.mock('@/components/features/SignupCompletedTracker', () => ({ SignupCompletedTracker: () => null }))
vi.mock('@/components/features/admin-quick-panel/AdminQuickPanelLoader', async () => {
  const mod = await import('@/components/features/admin-quick-panel/AdminQuickPanel')
  return { default: mod.default }
})

async function renderAppLayout() {
  const { default: AppLayout } = await import('@/app/(app)/layout')
  const tree = await AppLayout({ children: createElement('p', null, 'page content') })
  return render(tree)
}

// --- helpers ------------------------------------------------------------------

// hidden: a modal sheet marks the rest of the page aria-hidden while it is open.
const tab = () => screen.getByRole('button', { name: 'Open admin panel', hidden: true })
const queryTab = () => screen.queryByRole('button', { name: 'Open admin panel' })
const layer = () => screen.queryByTestId('touch-indicator-layer')
const rings = () => Array.from(document.querySelectorAll('[data-touch-indicator="ring"]')) as HTMLElement[]
const dots = () => document.querySelectorAll('[data-touch-indicator="trail"]')

function pointer(
  type: string,
  x: number,
  y: number,
  target: EventTarget = document.body,
  id = 1,
  pointerType = ''
) {
  const ev = new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, pointerType, bubbles: true, cancelable: true })
  act(() => {
    target.dispatchEvent(ev)
  })
  return ev
}

// A touch event as the browser sends it while a drag scrolls the page.
function touch(type: string, x: number, y: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  const point = [{ identifier: 0, clientX: x, clientY: y }]
  Object.defineProperty(ev, 'touches', { value: type === 'touchend' ? [] : point })
  Object.defineProperty(ev, 'changedTouches', { value: point })
  act(() => {
    document.body.dispatchEvent(ev)
  })
  return ev
}

function openPanel() {
  fireEvent.click(tab())
  return screen.getByRole('dialog', { name: 'Admin' })
}

function turnOnIndicators(style?: 'Ring' | 'Trail') {
  const panel = openPanel()
  fireEvent.click(within(panel).getByRole('switch', { name: /Touch indicators/ }))
  if (style) fireEvent.click(within(panel).getByRole('tab', { name: style }))
  fireEvent.keyDown(panel, { key: 'Escape' })
}

beforeEach(() => {
  h.role = 'admin'
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// --- scenarios ----------------------------------------------------------------

describe('Scenario: Admins see the tab; nobody else does', () => {
  it('shows the edge tab on app pages for an admin, fixed to the right edge', async () => {
    await renderAppLayout()
    expect(screen.getByText('page content')).toBeTruthy()
    expect(tab().style.position).toBe('fixed')
    expect(tab().className).toContain('right-[env(safe-area-inset-right,0px)]')
  })

  it.each(['user', 'editor'])('never shows the tab or panel to a %s', async (role) => {
    h.role = role
    await renderAppLayout()
    expect(screen.getByText('page content')).toBeTruthy()
    expect(queryTab()).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(layer()).toBeNull()
  })
})

describe('Scenario: The tab opens a side drawer', () => {
  it('opens a drawer titled "Admin" anchored to the right over a dimmed page', () => {
    render(createElement(AdminQuickPanel))
    expect(screen.queryByRole('dialog')).toBeNull()
    const panel = openPanel()
    expect(panel.style.position).toBe('fixed')
    expect(panel.style.right).toBe('0px')
    expect(screen.getByTestId('admin-panel-overlay')).toBeTruthy()
  })

  it('closes with its X', () => {
    render(createElement(AdminQuickPanel))
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes with a tap on the dimmed page', async () => {
    render(createElement(AdminQuickPanel))
    openPanel()
    // Radix starts listening for outside taps on the next tick.
    await act(() => new Promise((r) => setTimeout(r, 0)))
    const overlay = screen.getByTestId('admin-panel-overlay')
    fireEvent.pointerDown(overlay)
    fireEvent.mouseDown(overlay)
    fireEvent.pointerUp(overlay)
    fireEvent.click(overlay)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes with Escape', () => {
    render(createElement(AdminQuickPanel))
    const panel = openPanel()
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('leaves the page under it unchanged', async () => {
    await renderAppLayout()
    const page = screen.getByText('page content')
    const before = page.parentElement?.innerHTML
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.getByText('page content')).toBe(page)
    expect(page.parentElement?.innerHTML).toBe(before)
  })
})

describe('Scenario: The tab works over the loggers and sheets', () => {
  it('sits above every z-index used in the app', () => {
    // The highest z-index in components/ and app/, so a new layer above the
    // tab fails here rather than hiding the tab.
    const root = path.resolve(__dirname, '../..')
    const files = [
      ...fsWalk(path.join(root, 'components')),
      ...fsWalk(path.join(root, 'app')),
    ].filter((f) => !f.includes('admin-quick-panel'))
    let highest = 0
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/z-\[(\d+)\]|zIndex:\s*(\d+)/g)) {
        highest = Math.max(highest, Number(m[1] ?? m[2]))
      }
    }
    // The scan must find real layers (the highest was 9999 until ActionsMenu
    // was deleted in work 232).
    expect(highest).toBeGreaterThan(0)

    render(createElement(AdminQuickPanel))
    expect(Number(tab().style.zIndex)).toBeGreaterThan(highest)
    const panel = openPanel()
    expect(Number(panel.style.zIndex)).toBeGreaterThan(highest)
  })

  it('still opens the panel while a sheet (Radix dialog) is open, and the sheet stays open', async () => {
    const onOpenChange = vi.fn()
    render(
      createElement(
        'div',
        null,
        createElement(
          Dialog,
          { open: true, onOpenChange },
          createElement(DialogContent, null, createElement(DialogTitle, null, 'Swap exercise'))
        ),
        createElement(AdminQuickPanel)
      )
    )
    expect(screen.getByRole('dialog', { name: 'Swap exercise' })).toBeTruthy()
    // Radix sets pointer-events: none on body while a modal is open; the tab opts back in.
    expect(tab().style.pointerEvents).toBe('auto')
    // Radix starts listening for outside taps on the next tick.
    await act(() => new Promise((r) => setTimeout(r, 0)))
    fireEvent.pointerDown(tab())
    fireEvent.mouseDown(tab())
    fireEvent.pointerUp(tab())
    fireEvent.click(tab())
    expect(screen.getByRole('dialog', { name: 'Admin', hidden: true })).toBeTruthy()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('Swap exercise').closest('[role="dialog"]')?.getAttribute('data-state')).toBe('open')
  })
})

describe('Scenario: Touch indicators show where I tap', () => {
  it('is off by default and draws nothing', () => {
    render(createElement(AdminQuickPanel))
    expect(layer()).toBeNull()
    pointer('pointerdown', 50, 60)
    expect(rings()).toHaveLength(0)
  })

  it('shows a ring at the tap spot that fades out', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators()
    vi.useFakeTimers()
    pointer('pointerdown', 120, 340)
    pointer('pointerup', 120, 340)
    expect(rings()).toHaveLength(1)
    expect(rings()[0].style.left).toBe('120px')
    expect(rings()[0].style.top).toBe('340px')
    expect(rings()[0].style.animation).toContain(`${RING_FADE_MS}ms`)
    act(() => {
      vi.advanceTimersByTime(RING_FADE_MS)
    })
    expect(rings()).toHaveLength(0)
  })

  it('shows rings for taps anywhere, including over a sheet', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators()
    const sheet = document.createElement('div')
    sheet.style.position = 'fixed'
    sheet.style.zIndex = '9999'
    document.body.appendChild(sheet)
    pointer('pointerdown', 10, 20, sheet)
    expect(rings()).toHaveLength(1)
    expect(Number(layer()?.style.zIndex)).toBe(TOUCH_LAYER_Z)
    sheet.remove()
  })

  it('never blocks or changes what the tap does', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators()
    const button = document.createElement('button')
    const seen: string[] = []
    button.addEventListener('pointerdown', () => seen.push('pointerdown'))
    button.addEventListener('click', () => seen.push('click'))
    document.body.appendChild(button)

    const down = pointer('pointerdown', 30, 30, button)
    act(() => {
      button.click()
    })
    expect(seen).toEqual(['pointerdown', 'click'])
    expect(down.defaultPrevented).toBe(false)
    expect(layer()?.style.pointerEvents).toBe('none')
    button.remove()
  })
})

describe('Scenario: Drag trail', () => {
  it('leaves a short fading trail that ends in the ring', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators('Trail')
    vi.useFakeTimers()
    pointer('pointerdown', 300, 560)
    pointer('pointermove', 275, 520)
    pointer('pointermove', 250, 480)
    pointer('pointermove', 210, 400)

    expect(dots().length).toBeGreaterThanOrEqual(3)
    expect(rings()).toHaveLength(1)
    // The ring follows the finger and is drawn after (on top of) the trail.
    expect(rings()[0].style.left).toBe('210px')
    expect(rings()[0].style.top).toBe('400px')
    expect(rings()[0].previousElementSibling?.getAttribute('data-touch-indicator')).toBe('trail')

    pointer('pointerup', 210, 400)
    act(() => {
      vi.advanceTimersByTime(RING_FADE_MS)
    })
    expect(dots()).toHaveLength(0)
    expect(rings()).toHaveLength(0)
  })

  it('keeps following a finger drag after the browser cancels the pointer to scroll', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators('Trail')
    vi.useFakeTimers()
    pointer('pointerdown', 300, 560, document.body, 1, 'touch')
    touch('touchstart', 300, 560)
    pointer('pointermove', 275, 520, document.body, 1, 'touch')
    touch('touchmove', 275, 520)
    // The drag turns into a scroll: no more pointer events, only touch events.
    pointer('pointercancel', 275, 520, document.body, 1, 'touch')
    expect(rings()).toHaveLength(1)
    touch('touchmove', 250, 480)
    touch('touchmove', 230, 440)
    touch('touchmove', 210, 400)

    expect(dots().length).toBeGreaterThanOrEqual(3)
    expect(rings()).toHaveLength(1)
    expect(rings()[0].style.left).toBe('210px')
    expect(rings()[0].style.top).toBe('400px')

    touch('touchend', 210, 400)
    act(() => {
      vi.advanceTimersByTime(RING_FADE_MS)
    })
    expect(rings()).toHaveLength(0)
    expect(dots()).toHaveLength(0)
  })

  it('never blocks scrolling (touch events are not cancelled)', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators('Trail')
    pointer('pointerdown', 300, 560, document.body, 1, 'touch')
    pointer('pointercancel', 300, 560, document.body, 1, 'touch')
    expect(touch('touchmove', 250, 480).defaultPrevented).toBe(false)
  })

  it('draws no trail with the Ring style', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators('Ring')
    pointer('pointerdown', 300, 560)
    pointer('pointermove', 250, 480)
    expect(dots()).toHaveLength(0)
  })
})

describe('Touch indicator listeners', () => {
  const EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchmove', 'touchend', 'touchcancel']

  it('listen on window in the capture phase, passive, and are removed when turned off', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    render(createElement(AdminQuickPanel))
    turnOnIndicators()

    const added = new Map<string, unknown>()
    for (const [type, fn, opts] of add.mock.calls) {
      if (EVENTS.includes(type)) {
        expect(opts).toEqual({ capture: true, passive: true })
        added.set(type, fn)
      }
    }
    expect([...added.keys()].sort()).toEqual([...EVENTS].sort())

    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('switch', { name: /Touch indicators/ }))
    for (const type of EVENTS) {
      const call = remove.mock.calls.find(([t, fn]) => t === type && fn === added.get(type))
      expect(call, type).toBeTruthy()
      expect((call?.[2] as AddEventListenerOptions).capture).toBe(true)
    }
    expect(layer()).toBeNull()
  })
})

describe('Scenario: The tab stays out of the recording', () => {
  it('shrinks the tab to a faint sliver while touch indicators are on', () => {
    render(createElement(AdminQuickPanel))
    expect(tab().dataset.recording).toBe('false')
    turnOnIndicators()
    expect(tab().dataset.recording).toBe('true')
    expect(tab().querySelector('.opacity-35')).toBeTruthy()
  })

  it('still opens the panel from the sliver', () => {
    render(createElement(AdminQuickPanel))
    turnOnIndicators()
    expect(openPanel()).toBeTruthy()
  })
})

describe('Scenario: My choices stick on this device', () => {
  it('keeps touch indicators on with the chosen style after a reload', () => {
    const first = render(createElement(AdminQuickPanel))
    turnOnIndicators('Trail')
    first.unmount()

    render(createElement(AdminQuickPanel))
    expect(layer()).toBeTruthy()
    const panel = openPanel()
    expect(within(panel).getByRole('switch', { name: /Touch indicators/ }).getAttribute('aria-checked')).toBe('true')
    expect(within(panel).getByRole('tab', { name: 'Trail' }).getAttribute('aria-selected')).toBe('true')
  })

  it('saves only to this device (localStorage, no server call)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    render(createElement(AdminQuickPanel))
    turnOnIndicators('Trail')
    expect(JSON.parse(window.localStorage.getItem(QUICK_PANEL_PREFS_KEY) ?? '{}')).toEqual({
      touchIndicators: true,
      touchStyle: 'trail',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(createElement(AdminQuickPanel))
    turnOnIndicators()
    expect(layer()).toBeTruthy()
  })
})

function fsWalk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...fsWalk(full))
    else if (/\.(tsx?|css)$/.test(name)) out.push(full)
  }
  return out
}
