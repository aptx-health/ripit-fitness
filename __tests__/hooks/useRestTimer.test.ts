import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __clearRestTimerCache, useRestTimer } from '@/hooks/useRestTimer'

// Mock requestAnimationFrame to execute synchronously in tests
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0)
    return 0
  })
  __clearRestTimerCache()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRestTimer', () => {
  it('starts the timer when a prescribed set is logged', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 'ex-1'),
      { initialProps: { count: 0 } }
    )

    expect(result.current.isRunning).toBe(false)

    // Log set 1
    rerender({ count: 1 })
    expect(result.current.isRunning).toBe(true)
  })

  it('restarts the timer on each new set including the final prescribed set', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 'ex-1'),
      { initialProps: { count: 0 } }
    )

    // Log sets 1, 2, 3 (the final prescribed set)
    rerender({ count: 1 })
    expect(result.current.isRunning).toBe(true)

    rerender({ count: 2 })
    expect(result.current.isRunning).toBe(true)

    // Set 3 is the last prescribed set — timer should STILL start
    rerender({ count: 3 })
    expect(result.current.isRunning).toBe(true)
  })

  it('starts the timer for extra sets beyond prescribed count', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 'ex-1'),
      { initialProps: { count: 3 } }
    )

    // Timer running on mount when sets already logged
    expect(result.current.isRunning).toBe(true)

    // Log extra set 4
    rerender({ count: 4 })
    expect(result.current.isRunning).toBe(true)

    // Log extra set 5
    rerender({ count: 5 })
    expect(result.current.isRunning).toBe(true)
  })

  it('starts the timer when a deleted set is re-logged', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 'ex-1'),
      { initialProps: { count: 3 } }
    )

    // Delete a set (count goes from 3 to 2)
    rerender({ count: 2 })
    // Timer should still be running from before (count decreased, not zeroed)

    // Re-log the set (count goes from 2 to 3)
    rerender({ count: 3 })
    expect(result.current.isRunning).toBe(true)
  })

  it('stops the timer when all sets are deleted', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 'ex-1'),
      { initialProps: { count: 0 } }
    )

    // Log a set
    rerender({ count: 1 })
    expect(result.current.isRunning).toBe(true)

    // Delete all sets
    rerender({ count: 0 })
    expect(result.current.isRunning).toBe(false)
  })

  it('resets when exercise changes', () => {
    const { result, rerender } = renderHook(
      ({ count, exId }) => useRestTimer(count, exId),
      { initialProps: { count: 1, exId: 'ex-1' } }
    )

    // Timer running on mount when sets already logged
    expect(result.current.isRunning).toBe(true)

    // Switch exercise — timer resets
    rerender({ count: 0, exId: 'ex-2' })
    expect(result.current.isRunning).toBe(false)
    expect(result.current.elapsed).toBe(0)
  })

  it('preserves elapsed time across unmount/remount (tab switch within exercise)', () => {
    // Simulate user logs a set, switches to Info tab (unmount), waits, then
    // switches back to Log Sets tab (remount). Timer must not reset to zero.
    const realNow = Date.now.bind(Date)
    const t0 = 1_700_000_000_000
    let now = t0
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    try {
      // Initial mount with no logged sets
      const first = renderHook(
        ({ count }) => useRestTimer(count, 'ex-1'),
        { initialProps: { count: 0 } }
      )

      // Log a set — timer starts at t0
      first.rerender({ count: 1 })
      expect(first.result.current.isRunning).toBe(true)
      expect(first.result.current.elapsed).toBe(0)

      // 30 seconds pass while user is on the Info tab. Unmount, then remount.
      first.unmount()
      now = t0 + 30_000

      const second = renderHook(
        ({ count }) => useRestTimer(count, 'ex-1'),
        { initialProps: { count: 1 } }
      )

      // Timer should still be running and show 30 seconds elapsed, not 0.
      expect(second.result.current.isRunning).toBe(true)
      expect(second.result.current.elapsed).toBe(30)
    } finally {
      vi.spyOn(Date, 'now').mockImplementation(realNow)
    }
  })

  it('starts the timer when logging a set from zero', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 'ex-1'),
      { initialProps: { count: 0 } }
    )

    rerender({ count: 1 })
    expect(result.current.isRunning).toBe(true)
  })
})
