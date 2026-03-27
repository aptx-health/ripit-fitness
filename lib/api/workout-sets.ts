import type { LoggedSet } from '@/types/workout'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

type CreateSetInput = Omit<LoggedSet, 'id' | '_syncStatus'>

type CreateSetResponse = {
  set: { id: string } & CreateSetInput
  completionId: string
}

type DeleteSetResponse = {
  renumbered: Array<{ id: string; setNumber: number }>
}

type DraftResponse = {
  completionId: string
  sets: LoggedSet[]
} | null

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const error = new Error(body.error || `HTTP ${response.status}`)
        ;(error as Error & { status?: number }).status = response.status
        throw error
      }

      return await response.json() as T
    } catch (error) {
      lastError = error as Error
      const status = (error as Error & { status?: number }).status

      // Don't retry client errors (4xx) except 408 (timeout) and 429 (rate limit)
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt))
        )
      }
    }
  }

  throw lastError!
}

export async function createDraftSet(
  workoutId: string,
  set: CreateSetInput
): Promise<CreateSetResponse> {
  const result = await fetchWithRetry<{ success: boolean } & CreateSetResponse>(
    `/api/workouts/${workoutId}/draft/sets`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(set),
    }
  )
  return { set: result.set, completionId: result.completionId }
}

export async function deleteDraftSet(
  workoutId: string,
  setId: string
): Promise<DeleteSetResponse> {
  return fetchWithRetry<DeleteSetResponse>(
    `/api/workouts/${workoutId}/draft/sets/${setId}`,
    { method: 'DELETE' }
  )
}

export async function fetchDraft(workoutId: string): Promise<DraftResponse> {
  const result = await fetchWithRetry<{
    success: boolean
    draft: {
      id: string
      loggedSets: Array<{
        id: string
        exerciseId: string
        setNumber: number
        reps: number
        weight: number
        weightUnit: string
        rpe: number | null
        rir: number | null
        isWarmup: boolean
      }>
    } | null
  }>(`/api/workouts/${workoutId}/draft`, { method: 'GET' })

  if (!result.draft) return null

  return {
    completionId: result.draft.id,
    sets: result.draft.loggedSets.map(s => ({
      id: s.id,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.weightUnit,
      rpe: s.rpe,
      rir: s.rir,
      isWarmup: s.isWarmup,
      _syncStatus: 'synced' as const,
    })),
  }
}

export async function completeDraft(
  workoutId: string,
  fallbackSets?: LoggedSet[]
): Promise<void> {
  await fetchWithRetry<{ success: boolean }>(
    `/api/workouts/${workoutId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fallbackSets: fallbackSets?.map(s => ({
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          weightUnit: s.weightUnit,
          rpe: s.rpe,
          rir: s.rir,
          isWarmup: s.isWarmup ?? false,
        })),
      }),
    }
  )
}

export async function discardDraft(workoutId: string): Promise<void> {
  await fetchWithRetry<{ success: boolean }>(
    `/api/workouts/${workoutId}/clear`,
    { method: 'POST' }
  )
}
