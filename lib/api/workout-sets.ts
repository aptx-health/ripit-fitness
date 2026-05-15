import { fetchJsonWithRetry } from '@/lib/api/fetch'
import type { WorkoutRollup } from '@/lib/stats/workout-rollup'
import type { LoggedSet } from '@/types/workout'

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
  startedAt: string | null
} | null

export async function createDraftSet(
  workoutId: string,
  set: CreateSetInput
): Promise<CreateSetResponse> {
  const result = await fetchJsonWithRetry<{ success: boolean } & CreateSetResponse>(
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
  return fetchJsonWithRetry<DeleteSetResponse>(
    `/api/workouts/${workoutId}/draft/sets/${setId}`,
    { method: 'DELETE' }
  )
}

export async function fetchDraft(workoutId: string): Promise<DraftResponse> {
  const result = await fetchJsonWithRetry<{
    success: boolean
    draft: {
      id: string
      startedAt: string | null
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
    startedAt: result.draft.startedAt,
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

export type CompleteDraftResult = {
  completionId: string
  rollup: WorkoutRollup | null
}

export async function completeDraft(
  workoutId: string,
  fallbackSets?: LoggedSet[],
  guidedCompletion?: boolean
): Promise<CompleteDraftResult> {
  const res = await fetchJsonWithRetry<{
    success: boolean
    completion: { id: string }
    rollup: WorkoutRollup | null
  }>(
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
        ...(guidedCompletion && { guidedCompletion: true }),
      }),
    }
  )
  return { completionId: res.completion.id, rollup: res.rollup }
}

export async function discardDraft(workoutId: string): Promise<void> {
  await fetchJsonWithRetry<{ success: boolean }>(
    `/api/workouts/${workoutId}/clear`,
    { method: 'POST' }
  )
}
