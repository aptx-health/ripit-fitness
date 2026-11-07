/**
 * Motion and E-ink display (work item 131). Spec: features/ui/eink.feature, "No motion", "Static
 * skeletons". CSS can switch off keyframes and transitions (eink-css.test.ts); these are the places
 * that decide in script, and they must behave as if reduced motion were requested.
 *
 * Pinned:
 *   `@/lib/display` exports `useReducedMotion(): boolean`: true when the OS asks
 *   (`(prefers-reduced-motion: reduce)` matches) OR E-ink display is on (localStorage `einkDisplay`
 *   "true" with `data-display="eink"` on <html>, the way the inline script leaves it). It follows
 *   both changing while mounted: the OS query's "change" event, and setEinkDisplay + applyEinkDisplay.
 *   False on a plain device. The components below use it instead of their own matchMedia checks:
 *
 *   - PlanLine: no [data-plan-flash] when the plan is finished with E-ink display on (the check
 *     [data-plan-done] still shows).
 *   - ExerciseImageCrossfade (two images): the stacked START / FINISH layout with no animation and
 *     no pause button, the layout it already has for reduced motion.
 *   - FollowAlongTabs: the "What to do" card never gets the `wtd-pulse` class.
 *   - PixelDriftBackground: renders none of its [data-pixel-drift] icons.
 *   - LiftSkeleton: nothing in it has an `animate-pulse` class (still blocks, not pulsing); still
 *     announces "Loading…".
 *   With E-ink display off, each still animates as before (the control for every test).
 */

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

vi.mock('next/image', () => ({
  default: ({ src, alt, fill: _fill, priority: _p, sizes: _s, ...rest }: Record<string, unknown>) => createElement('img', { src: String(src), alt: String(alt), ...rest }),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

// ---- OS reduced-motion query, controllable ----
const os = { reduce: false, listeners: new Set<(e: { matches: boolean }) => void>() }
function stubMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => {
    const reduce = query.includes('prefers-reduced-motion')
    const mq = {
      get matches() {
        return reduce && os.reduce
      },
      media: query,
      onchange: null,
      addEventListener: (_t: string, fn: (e: { matches: boolean }) => void) => {
        if (reduce) os.listeners.add(fn)
      },
      removeEventListener: (_t: string, fn: (e: { matches: boolean }) => void) => os.listeners.delete(fn),
      addListener: (fn: (e: { matches: boolean }) => void) => {
        if (reduce) os.listeners.add(fn)
      },
      removeListener: (fn: (e: { matches: boolean }) => void) => os.listeners.delete(fn),
      dispatchEvent: () => true,
    }
    return mq
  })
}
function setOs(reduce: boolean) {
  os.reduce = reduce
  for (const fn of [...os.listeners]) fn({ matches: reduce })
}

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;path=/;max-age=0`
  }
}
/**
 * E-ink display on the way the inline script leaves a page: stored, and applied to <html>. Also
 * through lib/display when it exists, so any state it keeps in the module is reset between tests.
 */
async function seedEink(on: boolean) {
  localStorage.setItem('einkDisplay', String(on))
  if (on) document.documentElement.dataset.display = 'eink'
  else document.documentElement.removeAttribute('data-display')
  try {
    const d = (await load('@/lib/display')) as { setEinkDisplay: (on: boolean) => void; applyEinkDisplay: (on: boolean) => void }
    d.setEinkDisplay(on)
    d.applyEinkDisplay(on)
  } catch {
    // lib/display isn't there yet: the tests that need it say so themselves.
  }
}

beforeEach(() => {
  os.reduce = false
  os.listeners.clear()
  stubMatchMedia()
  localStorage.clear()
  clearCookies()
  document.documentElement.removeAttribute('data-display')
})
afterEach(async () => {
  cleanup()
  await seedEink(false)
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
  clearCookies()
  document.documentElement.removeAttribute('data-display')
})

// =====================================================================================
describe('useReducedMotion', () => {
  async function mount() {
    const { useReducedMotion } = (await load('@/lib/display')) as { useReducedMotion: () => boolean }
    const Probe = () => createElement('span', { 'data-rm': '' }, String(useReducedMotion()))
    render(createElement(Probe))
    return () => document.querySelector('[data-rm]')?.textContent
  }

  it('is false on a plain device', async () => {
    const read = await mount()
    expect(read()).toBe('false')
  })

  it('is true when the OS asks for reduced motion', async () => {
    os.reduce = true
    const read = await mount()
    expect(read()).toBe('true')
  })

  it('is true when E-ink display is on, with the OS asking for nothing', async () => {
    await seedEink(true)
    const read = await mount()
    expect(read()).toBe('true')
  })

  it('is true when both are on', async () => {
    await seedEink(true)
    os.reduce = true
    const read = await mount()
    expect(read()).toBe('true')
  })

  it('is false when E-ink display is stored off', async () => {
    await seedEink(false)
    const read = await mount()
    expect(read()).toBe('false')
  })

  it('follows the OS setting changing while mounted', async () => {
    const read = await mount()
    expect(read()).toBe('false')
    act(() => setOs(true))
    await waitFor(() => expect(read()).toBe('true'))
    act(() => setOs(false))
    await waitFor(() => expect(read()).toBe('false'))
  })

  it('follows E-ink display being turned on and off while mounted', async () => {
    const { setEinkDisplay, applyEinkDisplay } = (await load('@/lib/display')) as {
      setEinkDisplay: (on: boolean) => void
      applyEinkDisplay: (on: boolean) => void
    }
    const read = await mount()
    expect(read()).toBe('false')
    act(() => {
      setEinkDisplay(true)
      applyEinkDisplay(true)
    })
    await waitFor(() => expect(read()).toBe('true'))
    act(() => {
      setEinkDisplay(false)
      applyEinkDisplay(false)
    })
    await waitFor(() => expect(read()).toBe('false'))
  })

  it('turning E-ink off does not drop the OS preference', async () => {
    await seedEink(true)
    os.reduce = true
    const { setEinkDisplay, applyEinkDisplay } = (await load('@/lib/display')) as {
      setEinkDisplay: (on: boolean) => void
      applyEinkDisplay: (on: boolean) => void
    }
    const read = await mount()
    act(() => {
      setEinkDisplay(false)
      applyEinkDisplay(false)
    })
    await waitFor(() => expect(read()).toBe('true'))
  })
})

// =====================================================================================
describe('PlanLine flash', () => {
  const plan = [{ setNumber: 1, reps: '8', rpe: 8, rir: null, isWarmup: false }]
  const logged = [{ setNumber: 1, reps: 8, weight: 135, weightUnit: 'lbs', isWarmup: false }]

  async function flashes(einkOn: boolean, osReduce = false) {
    await seedEink(einkOn)
    os.reduce = osReduce
    const PlanLine = ((await load('@/components/adhoc/PlanLine')) as { default: (p: never) => ReactElement }).default
    const el = (loggedSets: unknown[]) =>
      createElement(PlanLine as never, { exerciseId: 'squat', prescribedSets: plan, loggedSets, expanded: false, onToggle: () => {} } as never)
    const view = render(el([]))
    expect(document.querySelector('[data-plan-flash]')).toBeNull()
    view.rerender(el(logged))
    await act(async () => {})
    return {
      flash: document.querySelectorAll('[data-plan-flash]').length,
      check: document.querySelectorAll('[data-plan-done]').length,
    }
  }

  it('control: finishing the plan flashes the line once', async () => {
    expect(await flashes(false)).toEqual({ flash: 1, check: 1 })
  })

  it('with E-ink display on there is no flash, and the check is still there', async () => {
    expect(await flashes(true)).toEqual({ flash: 0, check: 1 })
  })

  it('reduced motion from the OS still stops the flash', async () => {
    expect(await flashes(false, true)).toEqual({ flash: 0, check: 1 })
  })
})

// =====================================================================================
describe('ExerciseImageCrossfade', () => {
  const urls = ['a-start.png', 'a-finish.png']
  async function mount() {
    const C = ((await load('@/components/ui/ExerciseImageCrossfade')) as { default: (p: never) => ReactElement }).default
    return render(createElement(C as never, { imageUrls: urls, exerciseName: 'Back Squat' } as never))
  }
  const pauseButton = () => screen.queryByRole('button', { name: /pause animation|resume animation/i })

  it('control: two images crossfade, with a pause button', async () => {
    await mount()
    expect(pauseButton()).not.toBeNull()
  })

  it('with E-ink display on: both positions stacked with START and FINISH labels, no pause button', async () => {
    await seedEink(true)
    await mount()
    expect(pauseButton()).toBeNull()
    expect(screen.getByAltText(/start position/i)).toBeTruthy()
    expect(screen.getByAltText(/finish position/i)).toBeTruthy()
    expect(screen.getByText('START')).toBeTruthy()
    expect(screen.getByText('FINISH')).toBeTruthy()
  })

  it('with E-ink display on nothing fades: no image carries an opacity transition', async () => {
    await seedEink(true)
    await mount()
    for (const img of document.querySelectorAll('img')) expect((img as HTMLElement).style.transition).toBe('')
  })

  it('with E-ink display on, time passing changes nothing (no cycling timer)', async () => {
    vi.useFakeTimers()
    await seedEink(true)
    await mount()
    const before = document.body.innerHTML
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    expect(document.body.innerHTML).toBe(before)
  })

  it('turning E-ink display on while it is showing switches to the stacked layout', async () => {
    const { setEinkDisplay, applyEinkDisplay } = (await load('@/lib/display')) as {
      setEinkDisplay: (on: boolean) => void
      applyEinkDisplay: (on: boolean) => void
    }
    await mount()
    expect(pauseButton()).not.toBeNull()
    act(() => {
      setEinkDisplay(true)
      applyEinkDisplay(true)
    })
    await waitFor(() => expect(pauseButton()).toBeNull())
    expect(screen.getByText('FINISH')).toBeTruthy()
  })

  it('reduced motion from the OS still gives the stacked layout', async () => {
    os.reduce = true
    await mount()
    expect(pauseButton()).toBeNull()
    expect(screen.getByText('FINISH')).toBeTruthy()
  })
})

// =====================================================================================
describe('FollowAlongTabs pulse', () => {
  const exercise = { id: 'e1', name: 'Goblet Squat', notes: null, exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [], imageUrls: [] } }
  const sets = [{ id: 's1', setNumber: 1, reps: '12', weight: null, rpe: null, rir: null }]
  async function mount() {
    const C = ((await load('@/components/workout-logging/FollowAlongTabs')) as { default: (p: never) => ReactElement }).default
    render(createElement(C as never, { exercise, prescribedSets: sets, message: null } as never))
    await act(async () => {})
    return document.querySelector('.wtd-card') as HTMLElement
  }

  it('control: the "What to do" card pulses on load', async () => {
    expect((await mount()).classList.contains('wtd-pulse')).toBe(true)
  })

  it('with E-ink display on the card never gets the pulse class', async () => {
    await seedEink(true)
    expect((await mount()).classList.contains('wtd-pulse')).toBe(false)
  })

  it('reduced motion from the OS still stops it', async () => {
    os.reduce = true
    expect((await mount()).classList.contains('wtd-pulse')).toBe(false)
  })
})

// =====================================================================================
describe('PixelDriftBackground', () => {
  async function mount() {
    const C = ((await load('@/components/effects/PixelDriftBackground')) as { PixelDriftBackground: () => ReactElement }).PixelDriftBackground
    return render(createElement(C))
  }

  it('control: the drifting icons render', async () => {
    await mount()
    expect(document.querySelectorAll('[data-pixel-drift]').length).toBeGreaterThan(0)
  })

  it('with E-ink display on none of it renders', async () => {
    await seedEink(true)
    const { container } = await mount()
    expect(document.querySelectorAll('[data-pixel-drift]')).toHaveLength(0)
    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })

  it('turning E-ink display on removes the icons', async () => {
    const { setEinkDisplay, applyEinkDisplay } = (await load('@/lib/display')) as {
      setEinkDisplay: (on: boolean) => void
      applyEinkDisplay: (on: boolean) => void
    }
    await mount()
    expect(document.querySelectorAll('[data-pixel-drift]').length).toBeGreaterThan(0)
    act(() => {
      setEinkDisplay(true)
      applyEinkDisplay(true)
    })
    await waitFor(() => expect(document.querySelectorAll('[data-pixel-drift]')).toHaveLength(0))
  })
})

// =====================================================================================
describe('LiftSkeleton', () => {
  async function mount() {
    const C = ((await load('@/components/features/progress/LiftSkeleton')) as { default: (p: never) => ReactElement }).default
    render(createElement(C as never, {} as never))
    await act(async () => {})
  }
  const pulsing = () => [...document.querySelectorAll('[data-lift-skeleton] *')].filter((el) => /animate-pulse/.test(el.getAttribute('class') ?? ''))

  it('control: the placeholders pulse', async () => {
    await mount()
    expect(pulsing().length).toBeGreaterThan(0)
  })

  it('with E-ink display on nothing in it pulses', async () => {
    await seedEink(true)
    await mount()
    expect(pulsing()).toHaveLength(0)
  })

  it('with E-ink display on it is still the skeleton, and still says "Loading…"', async () => {
    await seedEink(true)
    await mount()
    expect(document.querySelector('[data-lift-skeleton]')).not.toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Loading…')
  })
})
