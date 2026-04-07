import { useCallback, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import type { Week } from '@/types/program-builder'

type UseWorkoutActionsParams = {
  editMode: boolean
  setWeeksCache: React.Dispatch<React.SetStateAction<Map<number, Week>>>
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  updateWeekData: (updater: (week: Week) => Week) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export function useWorkoutActions({
  editMode,
  setWeeksCache,
  setWeeks,
  updateWeekData,
  setIsLoading,
  setError,
}: UseWorkoutActionsParams) {
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editingWorkoutName, setEditingWorkoutName] = useState('')
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)

  const addWorkout = useCallback(async (weekId: string, sourceWorkoutId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceWorkoutId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add workout')
      }

      const { workout } = await response.json()

      if (editMode) {
        setWeeksCache(prev => {
          const newCache = new Map(prev)
          for (const [weekNum, week] of newCache) {
            if (week.id === weekId) {
              newCache.set(weekNum, {
                ...week,
                workouts: [...week.workouts, workout].sort((a, b) => a.dayNumber - b.dayNumber)
              })
              break
            }
          }
          return newCache
        })
      } else {
        setWeeks(prev => prev.map(week =>
          week.id === weekId
            ? { ...week, workouts: [...week.workouts, workout].sort((a, b) => a.dayNumber - b.dayNumber) }
            : week
        ))
      }

      clientLogger.debug('Workout added successfully:', workout)
    } catch (error) {
      clientLogger.error('Error adding workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to add workout')
    } finally {
      setIsLoading(false)
    }
  }, [editMode, setWeeksCache, setWeeks, setIsLoading, setError])

  const handleStartWorkoutEdit = useCallback((workoutId: string, currentName: string) => {
    setEditingWorkoutId(workoutId)
    setEditingWorkoutName(currentName)
  }, [])

  const handleCancelWorkoutEdit = useCallback(() => {
    setEditingWorkoutId(null)
    setEditingWorkoutName('')
  }, [])

  const handleSaveWorkoutName = useCallback(async (workoutId: string) => {
    if (!editingWorkoutName.trim()) {
      setError('Workout name cannot be empty')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingWorkoutName.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workout name')
      }

      const { workout: updatedWorkout } = await response.json()

      updateWeekData(week => ({
        ...week,
        workouts: week.workouts.map(workout =>
          workout.id === workoutId
            ? { ...workout, name: updatedWorkout.name }
            : workout
        )
      }))

      setEditingWorkoutId(null)
      setEditingWorkoutName('')

      clientLogger.debug('Workout name updated successfully:', updatedWorkout)
    } catch (error) {
      clientLogger.error('Error updating workout name:', error)
      setError(error instanceof Error ? error.message : 'Failed to update workout name')
    } finally {
      setIsLoading(false)
    }
  }, [editingWorkoutName, updateWeekData, setIsLoading, setError])

  const handleDeleteWorkout = useCallback(async (workoutId: string, workoutName: string) => {
    if (!confirm(`Are you sure you want to delete "${workoutName}" and all its exercises? This cannot be undone.`)) {
      return
    }

    setDeletingWorkoutId(workoutId)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, { method: 'DELETE' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete workout')
      }

      updateWeekData(week => ({
        ...week,
        workouts: week.workouts.filter(workout => workout.id !== workoutId)
      }))

      clientLogger.debug('Workout deleted successfully')
    } catch (error) {
      clientLogger.error('Error deleting workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete workout')
    } finally {
      setDeletingWorkoutId(null)
    }
  }, [updateWeekData, setError])

  return {
    editingWorkoutId,
    editingWorkoutName,
    setEditingWorkoutName,
    deletingWorkoutId,
    addWorkout,
    handleStartWorkoutEdit,
    handleCancelWorkoutEdit,
    handleSaveWorkoutName,
    handleDeleteWorkout,
  }
}
