import { useCallback, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import type { Week, WeekSummary } from '@/types/program-builder'

type UseWorkoutActionModalsParams = {
  editMode: boolean
  weeksSummary: WeekSummary[]
  setWeeksCache: React.Dispatch<React.SetStateAction<Map<number, Week>>>
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export function useWorkoutActionModals({
  editMode,
  weeksSummary: _weeksSummary,
  setWeeksCache,
  setWeeks,
  setIsLoading,
  setError,
}: UseWorkoutActionModalsParams) {
  const [showDuplicateWorkoutModal, setShowDuplicateWorkoutModal] = useState(false)
  const [showSwapWorkoutModal, setShowSwapWorkoutModal] = useState(false)
  const [selectedWorkoutForAction, setSelectedWorkoutForAction] = useState<{ id: string; name: string } | null>(null)
  const [targetWeekForDuplicate, setTargetWeekForDuplicate] = useState<string>('')
  const [targetWeekForSwap, setTargetWeekForSwap] = useState<string>('')

  const handleDuplicateWorkout = useCallback(async () => {
    if (!selectedWorkoutForAction || !targetWeekForDuplicate) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${selectedWorkoutForAction.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekId: targetWeekForDuplicate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate workout')
      }

      const { workout: newWorkout } = await response.json()

      if (editMode) {
        setWeeksCache(prev => {
          const newCache = new Map(prev)
          for (const [weekNum, week] of newCache) {
            if (week.id === targetWeekForDuplicate) {
              newCache.set(weekNum, {
                ...week,
                workouts: [...week.workouts, newWorkout].sort((a, b) => a.dayNumber - b.dayNumber)
              })
              break
            }
          }
          return newCache
        })
      } else {
        setWeeks(prev => prev.map(week =>
          week.id === targetWeekForDuplicate
            ? { ...week, workouts: [...week.workouts, newWorkout].sort((a, b) => a.dayNumber - b.dayNumber) }
            : week
        ))
      }

      clientLogger.debug('Workout duplicated successfully')
      setShowDuplicateWorkoutModal(false)
      setSelectedWorkoutForAction(null)
      setTargetWeekForDuplicate('')
    } catch (error) {
      clientLogger.error('Error duplicating workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate workout')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkoutForAction, targetWeekForDuplicate, editMode, setWeeksCache, setWeeks, setIsLoading, setError])

  const handleSwapWorkout = useCallback(async () => {
    if (!selectedWorkoutForAction || !targetWeekForSwap) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${selectedWorkoutForAction.id}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekId: targetWeekForSwap }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to swap workout')
      }

      const { workout: updatedWorkout } = await response.json()

      if (editMode) {
        setWeeksCache(prev => {
          const newCache = new Map(prev)
          for (const [weekNum, week] of newCache) {
            const isTargetWeek = week.id === targetWeekForSwap
            const filteredWorkouts = week.workouts.filter(w => w.id !== selectedWorkoutForAction.id)
            newCache.set(weekNum, {
              ...week,
              workouts: isTargetWeek
                ? [...filteredWorkouts, updatedWorkout].sort((a, b) => a.dayNumber - b.dayNumber)
                : filteredWorkouts
            })
          }
          return newCache
        })
      } else {
        setWeeks(prev => prev.map(week => ({
          ...week,
          workouts: week.id === targetWeekForSwap
            ? [...week.workouts.filter(w => w.id !== selectedWorkoutForAction.id), updatedWorkout].sort((a, b) => a.dayNumber - b.dayNumber)
            : week.workouts.filter(w => w.id !== selectedWorkoutForAction.id)
        })))
      }

      clientLogger.debug('Workout swapped successfully')
      setShowSwapWorkoutModal(false)
      setSelectedWorkoutForAction(null)
      setTargetWeekForSwap('')
    } catch (error) {
      clientLogger.error('Error swapping workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to swap workout')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkoutForAction, targetWeekForSwap, editMode, setWeeksCache, setWeeks, setIsLoading, setError])

  return {
    showDuplicateWorkoutModal,
    setShowDuplicateWorkoutModal,
    showSwapWorkoutModal,
    setShowSwapWorkoutModal,
    selectedWorkoutForAction,
    setSelectedWorkoutForAction,
    targetWeekForDuplicate,
    setTargetWeekForDuplicate,
    targetWeekForSwap,
    setTargetWeekForSwap,
    handleDuplicateWorkout,
    handleSwapWorkout,
  }
}
