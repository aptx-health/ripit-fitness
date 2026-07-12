import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgressiveExercises } from '@/hooks/useProgressiveExercises'

// These tests guard the async-history race that blanked prefilled sets when
// navigating back to an exercise a second time: history fetches were being
// dropped mid-navigation and the exercise stranded in a permanent "loading"
// state. See ExerciseLoggingModal prefill logic.

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  } as Response
}

function makeExercise(order: number) {
  return {
    id: `ex${order}`,
    name: `Exercise ${order}`,
    order,
    exerciseGroup: null,
    notes: null,
    exerciseDefinitionId: `def${order}`,
    prescribedSets: [
      { id: `ps${order}`, setNumber: 1, reps: '5', weight: null, rpe: null, rir: null },
    ],
  }
}

function makeHistory(weight: number) {
  return {
    completedAt: '2026-07-01T00:00:00.000Z',
    workoutName: 'Previous Workout',
    sets: [
      { setNumber: 1, reps: 5, weight, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false },
    ],
  }
}

// Weight returned by the mocked history endpoint, keyed by exercise id.
const HISTORY_WEIGHT: Record<string, number> = { ex1: 100, ex2: 225 }

function installFetchMock() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    const exerciseMatch = url.match(/\/api\/workouts\/w1\/exercises\/(\d+)/)
    if (exerciseMatch) {
      const order = Number(exerciseMatch[1])
      return jsonResponse({ exercise: makeExercise(order), totalExercises: 2 })
    }

    const historyMatch = url.match(/\/api\/exercises\/(ex\d+)\/history/)
    if (historyMatch) {
      const weight = HISTORY_WEIGHT[historyMatch[1]]
      const history = makeHistory(weight)
      return jsonResponse({ history, sessions: [history] })
    }

    return jsonResponse({}, false)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('useProgressiveExercises history persistence', () => {
  beforeEach(() => {
    installFetchMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps previous-workout history available when navigating back to an exercise', async () => {
    const { result } = renderHook(() => useProgressiveExercises('w1', 2))

    // Exercise 1 loads with its previous-workout history.
    await waitFor(() => expect(result.current.currentExercise?.id).toBe('ex1'))
    await waitFor(() =>
      expect(result.current.currentExerciseHistory?.sets[0].weight).toBe(100)
    )
    expect(result.current.currentHistoryState).toBe('loaded')

    // Swipe to exercise 2 — it too preloads its own history.
    act(() => {
      result.current.goToNext()
    })
    await waitFor(() => expect(result.current.currentExercise?.id).toBe('ex2'))
    await waitFor(() =>
      expect(result.current.currentExerciseHistory?.sets[0].weight).toBe(225)
    )

    // Swipe back to exercise 1. Regression: history used to be gone (stranded in
    // "loading"), which zeroed the prefilled set. It must still be present.
    act(() => {
      result.current.goToPrevious()
    })
    await waitFor(() => expect(result.current.currentExercise?.id).toBe('ex1'))
    expect(result.current.currentHistoryState).toBe('loaded')
    expect(result.current.currentExerciseHistory?.sets[0].weight).toBe(100)
  })

  it('does not refetch history that is already loaded on revisit', async () => {
    const fetchMock = installFetchMock()
    const { result } = renderHook(() => useProgressiveExercises('w1', 2))

    await waitFor(() =>
      expect(result.current.currentExerciseHistory?.sets[0].weight).toBe(100)
    )

    act(() => {
      result.current.goToNext()
    })
    await waitFor(() => expect(result.current.currentExercise?.id).toBe('ex2'))

    const ex1HistoryCallsBefore = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/exercises/ex1/history')
    ).length

    act(() => {
      result.current.goToPrevious()
    })
    await waitFor(() => expect(result.current.currentExercise?.id).toBe('ex1'))

    const ex1HistoryCallsAfter = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/exercises/ex1/history')
    ).length

    expect(ex1HistoryCallsAfter).toBe(ex1HistoryCallsBefore)
  })
})
