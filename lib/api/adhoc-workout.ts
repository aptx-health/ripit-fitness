/**
 * Client API for ad-hoc (freestyle) workouts. Every call routes through
 * fetchJsonWithRetry so spotty connections get exponential-backoff retries
 * and callers get a typed FetchError to drive failure UX.
 */

import { type FetchWithRetryOptions, fetchJsonWithRetry } from '@/lib/api/fetch'

type RetryOpts = Pick<FetchWithRetryOptions, 'onRetry' | 'noRetry'>

type AdHocExercisePayload = {
  id: string
  name: string
  notes: string | null
  exerciseDefinition: {
    primaryFAUs: string[]
    secondaryFAUs: string[]
    equipment: string[]
    instructions?: string | null
    imageUrls?: string[]
  }
}

type LoggedSetPayload = {
  id: string
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup: boolean
}

export async function startFreestyleWorkout(
  retry: RetryOpts = {}
): Promise<{ id: string; name: string | null; startedAt: string | null }> {
  const result = await fetchJsonWithRetry<{
    completion: { id: string; name: string | null; startedAt: string | null }
  }>('/api/workouts/adhoc', { method: 'POST' }, retry)
  return result.completion
}

export async function addAdHocExercises(
  completionId: string,
  exerciseDefinitionIds: string[],
  retry: RetryOpts = {}
): Promise<AdHocExercisePayload[]> {
  const result = await fetchJsonWithRetry<{
    exercises: AdHocExercisePayload[]
  }>(
    `/api/workouts/adhoc/${completionId}/exercises`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseDefinitionIds }),
    },
    retry
  )
  return result.exercises
}

export async function swapAdHocExercise(
  exerciseId: string,
  newExerciseDefinitionId: string,
  retry: RetryOpts = {}
): Promise<AdHocExercisePayload> {
  const result = await fetchJsonWithRetry<{
    exercises: AdHocExercisePayload[]
  }>(
    `/api/exercises/${exerciseId}/replace`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newExerciseDefinitionId, applyToFuture: false }),
    },
    retry
  )
  const updated = result.exercises?.[0]
  if (!updated) throw new Error('Swap returned no exercise')
  return updated
}

export async function deleteAdHocExercise(
  exerciseId: string,
  retry: RetryOpts = {}
): Promise<void> {
  await fetchJsonWithRetry<{ success: boolean }>(
    `/api/exercises/${exerciseId}/delete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applyToFuture: false }),
    },
    retry
  )
}

export async function reorderAdHocExercises(
  completionId: string,
  orderedIds: string[],
  retry: RetryOpts = {}
): Promise<void> {
  await fetchJsonWithRetry<{ success: boolean }>(
    `/api/workouts/adhoc/${completionId}/exercises/reorder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercises: orderedIds.map((exerciseId, idx) => ({ exerciseId, order: idx + 1 })),
      }),
    },
    retry
  )
}

export async function logAdHocSet(
  completionId: string,
  set: {
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe: number | null
    rir: number | null
    isWarmup?: boolean
  },
  retry: RetryOpts = {}
): Promise<LoggedSetPayload> {
  const result = await fetchJsonWithRetry<{ set: LoggedSetPayload }>(
    `/api/workouts/adhoc/${completionId}/sets`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(set),
    },
    retry
  )
  return result.set
}

export async function deleteAdHocSet(
  completionId: string,
  setId: string,
  retry: RetryOpts = {}
): Promise<{ renumbered: Array<{ id: string; setNumber: number }> }> {
  return fetchJsonWithRetry(
    `/api/workouts/adhoc/${completionId}/sets/${setId}`,
    { method: 'DELETE' },
    retry
  )
}

export async function completeAdHocWorkout<TRollup = unknown>(
  completionId: string,
  retry: RetryOpts = {}
): Promise<{ rollup: TRollup | null }> {
  const result = await fetchJsonWithRetry<{
    success: boolean
    rollup: TRollup | null
  }>(`/api/workouts/adhoc/${completionId}/complete`, { method: 'POST' }, retry)
  return { rollup: result.rollup ?? null }
}

export async function discardAdHocWorkout(
  completionId: string,
  retry: RetryOpts = {}
): Promise<void> {
  await fetchJsonWithRetry<{ success: boolean }>(
    `/api/workouts/adhoc/${completionId}`,
    { method: 'DELETE' },
    retry
  )
}

export async function fetchExerciseHistory(
  exerciseId: string,
  retry: RetryOpts = {}
): Promise<unknown | null> {
  const result = await fetchJsonWithRetry<{ history: unknown | null }>(
    `/api/exercises/${exerciseId}/history`,
    { method: 'GET' },
    retry
  )
  return result.history ?? null
}
