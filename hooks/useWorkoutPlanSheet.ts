'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { elapsedSince, type WorkoutPlanEditorExercise } from '@/components/workout-logging/WorkoutPlanEditor'
import { clientLogger } from '@/lib/client-logger'
import type { LoggedSet } from '@/types/workout'

type PlanExercise = { id: string; name: string; setsPlanned?: number }

/**
 * State for the logger's Workout plan sheet: open/closed, the plan's exercises
 * (fetched on open), its ticking clock, rows with sets done, and reorder.
 * `onReordered` runs after the server accepts a new order.
 */
export function useWorkoutPlanSheet({
  workoutId,
  workoutCompletionId,
  startedAt,
  loggedSets,
  onReordered,
}: {
  workoutId: string
  workoutCompletionId?: string | null
  startedAt?: string | null
  loggedSets: LoggedSet[]
  onReordered: (orderedIds: string[]) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  // The plan's exercises (from the exercises GET); sets done come from the logged sets.
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [elapsed, setElapsed] = useState<string | undefined>(undefined)
  const [isReordering, setIsReordering] = useState(false)
  // When the logger opened: the clock's start until the draft has its own (as the header's timer does).
  const openedAt = useRef<string | null>(null)
  useEffect(() => {
    openedAt.current = new Date().toISOString()
  }, [])

  // The plan's clock ticks while the sheet is open, like the header's.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setElapsed(elapsedSince(startedAt ?? openedAt.current, Date.now())), 1000)
    return () => clearInterval(id)
  }, [open, startedAt])

  // Fetch the full exercise list when opening.
  const openSheet = useCallback(async () => {
    setOpen(true)
    setElapsed(elapsedSince(startedAt ?? openedAt.current, Date.now()))
    try {
      // With the session's id, the list includes exercises added during it (as the logger's own count does).
      const res = await fetch(
        `/api/workouts/${workoutId}/exercises${workoutCompletionId ? `?completionId=${encodeURIComponent(workoutCompletionId)}` : ''}`
      )
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { exercises: { id: string; name: string; prescribedSets?: unknown[] }[] }
      setExercises(
        data.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          setsPlanned: Array.isArray(e.prescribedSets) ? e.prescribedSets.length : undefined,
        }))
      )
    } catch (err) {
      clientLogger.error('Failed to load workout exercises for plan editor', err)
    }
  }, [workoutId, workoutCompletionId, startedAt])

  // Rows for the plan sheet: sets done per exercise, and the last logged weight as the detail.
  const rows = useMemo<WorkoutPlanEditorExercise[]>(
    () =>
      exercises.map((e) => {
        const sets = loggedSets.filter((s) => s.exerciseId === e.id)
        const last = sets[sets.length - 1]
        return {
          ...e,
          setsDone: sets.length,
          detail: last && last.weight > 0 ? `${last.weight} ${last.weightUnit}` : undefined,
        }
      }),
    [exercises, loggedSets]
  )

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      setIsReordering(true)
      // Optimistic; editor already updated its own local order.
      setExercises((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e] as const))
        return orderedIds.map((id) => byId.get(id)).filter((e): e is PlanExercise => Boolean(e))
      })
      try {
        const res = await fetch(`/api/workouts/${workoutId}/exercises/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercises: orderedIds.map((exerciseId, idx) => ({ exerciseId, order: idx + 1 })),
            completionId: workoutCompletionId,
          }),
        })
        if (!res.ok) throw new Error('Reorder failed')
        await onReordered(orderedIds)
      } catch (err) {
        clientLogger.error('Reorder failed', err)
      } finally {
        setIsReordering(false)
      }
    },
    [workoutId, workoutCompletionId, onReordered]
  )

  return { open, setOpen, exercises, elapsed, isReordering, openSheet, rows, reorder }
}
