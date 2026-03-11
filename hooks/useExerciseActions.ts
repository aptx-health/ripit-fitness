import { useCallback, useState } from 'react'
import type { Exercise, Week } from '@/types/program-builder'

type UseExerciseActionsParams = {
  editMode: boolean
  weeksCache: Map<number, Week>
  weeks: Week[]
  setWeeksCache: React.Dispatch<React.SetStateAction<Map<number, Week>>>
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  updateWeekData: (updater: (week: Week) => Week) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export function useExerciseActions({
  editMode,
  weeksCache,
  weeks,
  setWeeksCache,
  setWeeks,
  updateWeekData,
  setIsLoading,
  setError,
}: UseExerciseActionsParams) {
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null)

  const handleAddExercise = useCallback((workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    setEditingExercise(null)
    setShowExerciseModal(true)
  }, [])

  const handleEditExercise = useCallback((exercise: Exercise, workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    setEditingExercise(exercise)
    setShowExerciseModal(true)
  }, [])

  const handleReorderExercises = useCallback(async (workoutId: string, reorderedExercises: Exercise[]) => {
    // Store original state for rollback
    const originalCache = editMode ? new Map(weeksCache) : null
    const originalWeeks = !editMode ? [...weeks] : null

    // Optimistic update
    updateWeekData(week => ({
      ...week,
      workouts: week.workouts.map(workout =>
        workout.id === workoutId
          ? { ...workout, exercises: reorderedExercises }
          : workout
      )
    }))

    try {
      const response = await fetch(`/api/workouts/${workoutId}/exercises/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercises: reorderedExercises.map(e => ({
            exerciseId: e.id,
            order: e.order
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reorder exercises')
      }

      console.log('Exercises reordered successfully')
    } catch (error) {
      console.error('Error reordering exercises:', error)
      setError(error instanceof Error ? error.message : 'Failed to reorder exercises')

      // Rollback on failure
      if (editMode && originalCache) {
        setWeeksCache(originalCache)
      } else if (!editMode && originalWeeks) {
        setWeeks(originalWeeks)
      }
    }
  }, [editMode, weeksCache, weeks, updateWeekData, setWeeksCache, setWeeks, setError])

  const handleDeleteExercise = useCallback(async (exerciseId: string, exerciseName: string) => {
    if (!confirm(`Are you sure you want to delete "${exerciseName}"? This cannot be undone.`)) {
      return
    }

    setDeletingExerciseId(exerciseId)
    setError(null)

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, { method: 'DELETE' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete exercise')
      }

      updateWeekData(week => ({
        ...week,
        workouts: week.workouts.map(workout => ({
          ...workout,
          exercises: workout.exercises.filter(exercise => exercise.id !== exerciseId)
        }))
      }))

      console.log('Exercise deleted successfully')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete exercise')
    } finally {
      setDeletingExerciseId(null)
    }
  }, [updateWeekData, setError])

  const handleExerciseSelect = useCallback(async (
    exercise: { id: string; name: string },
    prescription: {
      sets: Array<{ setNumber: number; reps: string; intensityType: 'RIR' | 'RPE' | 'NONE'; intensityValue?: number }>
      notes?: string
    }
  ) => {
    if (!selectedWorkoutId) return

    setIsLoading(true)
    setError(null)

    try {
      if (editingExercise) {
        const response = await fetch(`/api/exercises/${editingExercise.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: prescription.notes,
            prescribedSets: prescription.sets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              weight: '',
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null
            }))
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update exercise')
        }

        const updatedExercise = data.exercises?.[0]

        if (!updatedExercise) {
          throw new Error('No updated exercise returned from server')
        }

        const mappedExercise: Exercise = {
          id: updatedExercise.id,
          name: updatedExercise.exerciseDefinition?.name || editingExercise.name,
          order: updatedExercise.order ?? editingExercise.order,
          notes: updatedExercise.notes,
          prescribedSets: updatedExercise.prescribedSets,
          exerciseDefinition: updatedExercise.exerciseDefinition || editingExercise.exerciseDefinition
        }

        updateWeekData(week => ({
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === selectedWorkoutId
              ? {
                  ...workout,
                  exercises: workout.exercises.map(ex =>
                    ex.id === editingExercise.id ? mappedExercise : ex
                  )
                }
              : workout
          )
        }))

        console.log('Exercise updated successfully:', updatedExercise)
      } else {
        const response = await fetch(`/api/workouts/${selectedWorkoutId}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseDefinitionId: exercise.id,
            notes: prescription.notes,
            prescribedSets: prescription.sets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              weight: '',
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null
            }))
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add exercise')
        }

        const { exercise: newExercise } = await response.json()

        updateWeekData(week => ({
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === selectedWorkoutId
              ? { ...workout, exercises: [...workout.exercises, newExercise] }
              : workout
          )
        }))

        console.log('Exercise added successfully:', newExercise)
      }
    } catch (error) {
      console.error('Error with exercise:', error)
      setError(error instanceof Error ? error.message : `Failed to ${editingExercise ? 'update' : 'add'} exercise`)
    } finally {
      setIsLoading(false)
      setSelectedWorkoutId(null)
      setEditingExercise(null)
    }
  }, [selectedWorkoutId, editingExercise, updateWeekData, setIsLoading, setError])

  const closeExerciseModal = useCallback(() => {
    setShowExerciseModal(false)
    setSelectedWorkoutId(null)
    setEditingExercise(null)
  }, [])

  return {
    showExerciseModal,
    editingExercise,
    deletingExerciseId,
    handleAddExercise,
    handleEditExercise,
    handleReorderExercises,
    handleDeleteExercise,
    handleExerciseSelect,
    closeExerciseModal,
  }
}
