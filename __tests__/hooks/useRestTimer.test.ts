import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRestTimer } from '@/hooks/useRestTimer'

// Mock requestAnimationFrame to execute synchronously in tests
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0)
    return 0
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRestTimer', () => {
  it('starts the timer when a prescribed set is logged', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 3, 'ex-1'),
      { initialProps: { count: 0 } }
    )

    expect(result.current.isRunning).toBe(false)

    // Log set 1
    rerender({ count: 1 })
    expect(result.current.isRunning).toBe(true)
  })

  it('restarts the timer on each new set including the final prescribed set', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 3, 'ex-1'),
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
      ({ count }) => useRestTimer(count, 3, 'ex-1'),
      { initialProps: { count: 3 } }
    )

    // Timer not running initially (all prescribed sets already logged)
    expect(result.current.isRunning).toBe(false)

    // Log extra set 4
    rerender({ count: 4 })
    expect(result.current.isRunning).toBe(true)

    // Log extra set 5
    rerender({ count: 5 })
    expect(result.current.isRunning).toBe(true)
  })

  it('starts the timer when a deleted set is re-logged', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 3, 'ex-1'),
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
      ({ count }) => useRestTimer(count, 3, 'ex-1'),
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
      ({ count, exId }) => useRestTimer(count, 3, exId),
      { initialProps: { count: 1, exId: 'ex-1' } }
    )

    expect(result.current.isRunning).toBe(false) // Initial mount, no increase

    // Switch exercise
    rerender({ count: 0, exId: 'ex-2' })
    expect(result.current.isRunning).toBe(false)
    expect(result.current.elapsed).toBe(0)
  })

  it('works with zero prescribed sets (extra-only scenario)', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRestTimer(count, 0, 'ex-1'),
      { initialProps: { count: 0 } }
    )

    // Log a set even though there are 0 prescribed
    rerender({ count: 1 })
    expect(result.current.isRunning).toBe(true)
  })
})
