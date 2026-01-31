'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import ExerciseSearchModal from './ExerciseSearchModal'
import FAUVolumeVisualization from './FAUVolumeVisualization'
import SortableExerciseList from './SortableExerciseList'

type Week = {
  id: string
  weekNumber: number
  workouts: Workout[]
}

type Workout = {
  id: string
  name: string
  dayNumber: number
  exercises: Exercise[]
}

type Exercise = {
  id: string
  name: string
  order: number
  notes?: string | null
  prescribedSets: PrescribedSet[]
  exerciseDefinition: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
  }
}

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string
  weight?: string | null
  rpe?: number | null
  rir?: number | null
}

type WeekSummary = {
  id: string
  weekNumber: number
}

type ExistingProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  // Lightweight summary of all weeks (for navigation)
  weeksSummary: WeekSummary[]
  // Initial week's full data (for lazy loading)
  initialWeek: Week | null
}

type ProgramBuilderProps = {
  editMode?: boolean
  existingProgram?: ExistingProgram
}

export default function ProgramBuilder({ editMode = false, existingProgram }: ProgramBuilderProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Program form state
  const [programName, setProgramName] = useState(editMode && existingProgram ? existingProgram.name : '')
  const [programDescription, setProgramDescription] = useState(editMode && existingProgram ? existingProgram.description || '' : '')
  const [programId, setProgramId] = useState<string | null>(editMode && existingProgram ? existingProgram.id : null)

  // Week management for edit mode (lazy loading)
  const [weeksSummary, setWeeksSummary] = useState<WeekSummary[]>(
    editMode && existingProgram ? existingProgram.weeksSummary : []
  )
  const [weeksCache, setWeeksCache] = useState<Map<number, Week>>(() => {
    const cache = new Map<number, Week>()
    if (editMode && existingProgram?.initialWeek) {
      cache.set(existingProgram.initialWeek.weekNumber, existingProgram.initialWeek)
    }
    return cache
  })

  // For create mode, we still use the simple weeks array
  const [weeks, setWeeks] = useState<Week[]>([])
  
  // Exercise modal state
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  
  // Workout editing state
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editingWorkoutName, setEditingWorkoutName] = useState('')
  
  // Deletion state
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null)
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null)
  const [duplicatingWeekId, setDuplicatingWeekId] = useState<string | null>(null)

  // Collapsed workouts state
  const [collapsedWorkouts, setCollapsedWorkouts] = useState<Set<string>>(new Set())

  // Week pagination state
  const [currentWeekIndex, setCurrentWeekIndex] = useState(() => {
    if (editMode && existingProgram?.initialWeek) {
      // Find the index of the initial week
      const idx = existingProgram.weeksSummary.findIndex(
        w => w.weekNumber === existingProgram.initialWeek?.weekNumber
      )
      return idx >= 0 ? idx : 0
    }
    return 0
  })

  // Get current week data (from cache in edit mode, from weeks array in create mode)
  const getCurrentWeekData = useCallback((): Week | null => {
    if (editMode) {
      const weekNumber = weeksSummary[currentWeekIndex]?.weekNumber
      return weekNumber ? weeksCache.get(weekNumber) || null : null
    }
    return weeks[currentWeekIndex] || null
  }, [editMode, weeksSummary, currentWeekIndex, weeksCache, weeks])

  // Fetch week data from API
  const fetchWeek = useCallback(async (weekNumber: number): Promise<Week | null> => {
    if (!programId) return null

    try {
      setIsLoadingWeek(true)
      const response = await fetch(`/api/programs/${programId}/weeks/${weekNumber}`)
      const data = await response.json()

      if (data.success && data.week) {
        setWeeksCache(prev => new Map(prev).set(weekNumber, data.week))
        return data.week
      }
      return null
    } catch (error) {
      console.error('Error fetching week:', error)
      setError('Failed to load week data')
      return null
    } finally {
      setIsLoadingWeek(false)
    }
  }, [programId])

  // Helper to update week data in the appropriate state
  const updateWeekData = useCallback((updater: (week: Week) => Week) => {
    if (editMode) {
      setWeeksCache(prev => {
        const newCache = new Map(prev)
        for (const [weekNum, week] of newCache) {
          newCache.set(weekNum, updater(week))
        }
        return newCache
      })
    } else {
      setWeeks(prev => prev.map(updater))
    }
  }, [editMode])

  // Navigate to a week (fetch if not cached)
  const navigateToWeek = useCallback(async (newIndex: number) => {
    if (newIndex < 0) return

    if (editMode) {
      if (newIndex >= weeksSummary.length) return

      const weekNumber = weeksSummary[newIndex]?.weekNumber
      if (weekNumber && !weeksCache.has(weekNumber)) {
        await fetchWeek(weekNumber)
      }
    } else {
      if (newIndex >= weeks.length) return
    }

    setCurrentWeekIndex(newIndex)
  }, [editMode, weeksSummary, weeksCache, weeks, fetchWeek])

  // Workout action modals
  const [showDuplicateWorkoutModal, setShowDuplicateWorkoutModal] = useState(false)
  const [showSwapWorkoutModal, setShowSwapWorkoutModal] = useState(false)
  const [selectedWorkoutForAction, setSelectedWorkoutForAction] = useState<{ id: string; name: string } | null>(null)
  const [targetWeekForDuplicate, setTargetWeekForDuplicate] = useState<string>('')
  const [targetWeekForSwap, setTargetWeekForSwap] = useState<string>('')

  const createProgram = useCallback(async () => {
    if (!programName.trim()) {
      setError('Program name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: programName.trim(),
          description: programDescription.trim() || undefined,
          programType: 'strength',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create program')
      }

      const { program } = await response.json()
      setProgramId(program.id)
      setWeeks(program.weeks || [])
      
      console.log('Program created successfully:', program)
    } catch (error) {
      console.error('Error creating program:', error)
      setError(error instanceof Error ? error.message : 'Failed to create program')
    } finally {
      setIsLoading(false)
    }
  }, [programName, programDescription])

  const addWeek = useCallback(async (sourceWeekId?: string) => {
    if (!programId) return

    setIsLoading(true)
    setError(null)

    try {
      // Calculate next week number based on mode
      const existingWeeks = editMode ? weeksSummary : weeks
      const nextWeekNumber = existingWeeks.length > 0
        ? Math.max(...existingWeeks.map(w => w.weekNumber)) + 1
        : 1

      const response = await fetch(`/api/programs/${programId}/weeks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekNumber: nextWeekNumber,
          sourceWeekId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add week')
      }

      const { week } = await response.json()

      if (editMode) {
        // Update summary and cache
        setWeeksSummary(prev => {
          const updated = [...prev, { id: week.id, weekNumber: week.weekNumber }]
            .sort((a, b) => a.weekNumber - b.weekNumber)
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
        setWeeksCache(prev => new Map(prev).set(week.weekNumber, week))
      } else {
        setWeeks(prev => {
          const updated = [...prev, week].sort((a, b) => a.weekNumber - b.weekNumber)
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
      }

      console.log('Week added successfully:', week)
    } catch (error) {
      console.error('Error adding week:', error)
      setError(error instanceof Error ? error.message : 'Failed to add week')
    } finally {
      setIsLoading(false)
    }
  }, [programId, editMode, weeksSummary, weeks])

  const addWorkout = useCallback(async (weekId: string, sourceWorkoutId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceWorkoutId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add workout')
      }

      const { workout } = await response.json()

      // Update the appropriate state based on mode
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

      console.log('Workout added successfully:', workout)
    } catch (error) {
      console.error('Error adding workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to add workout')
    } finally {
      setIsLoading(false)
    }
  }, [editMode])

  const handleComplete = useCallback(() => {
    // Validate all workouts have at least 1 exercise
    const emptyWorkouts: string[] = []

    // Get weeks to validate based on mode
    const weeksToValidate = editMode ? Array.from(weeksCache.values()) : weeks

    weeksToValidate.forEach(week => {
      week.workouts.forEach(workout => {
        if (workout.exercises.length === 0) {
          emptyWorkouts.push(`Week ${week.weekNumber} - ${workout.name}`)
        }
      })
    })

    if (emptyWorkouts.length > 0) {
      setError(
        `Cannot save program with empty workouts: ${emptyWorkouts.join(', ')}. ` +
        `Add at least one exercise to each workout or delete them.`
      )
      return
    }

    // Redirect to training page (programs are viewed there now)
    router.push('/training')
  }, [router, editMode, weeksCache, weeks])

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
  }, [editMode, weeksCache, weeks, updateWeekData])

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingWorkoutName.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workout name')
      }

      const { workout: updatedWorkout } = await response.json()

      // Update the weeks state
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

      console.log('Workout name updated successfully:', updatedWorkout)
    } catch (error) {
      console.error('Error updating workout name:', error)
      setError(error instanceof Error ? error.message : 'Failed to update workout name')
    } finally {
      setIsLoading(false)
    }
  }, [editingWorkoutName, updateWeekData])

  const handleDeleteExercise = useCallback(async (exerciseId: string, exerciseName: string) => {
    if (!confirm(`Are you sure you want to delete "${exerciseName}"? This cannot be undone.`)) {
      return
    }

    setDeletingExerciseId(exerciseId)
    setError(null)

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete exercise')
      }
      
      // Remove exercise from weeks state
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
  }, [updateWeekData])

  const handleDeleteWorkout = useCallback(async (workoutId: string, workoutName: string) => {
    if (!confirm(`Are you sure you want to delete "${workoutName}" and all its exercises? This cannot be undone.`)) {
      return
    }

    setDeletingWorkoutId(workoutId)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete workout')
      }
      
      // Remove workout from weeks state
      updateWeekData(week => ({
        ...week,
        workouts: week.workouts.filter(workout => workout.id !== workoutId)
      }))

      console.log('Workout deleted successfully')
    } catch (error) {
      console.error('Error deleting workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete workout')
    } finally {
      setDeletingWorkoutId(null)
    }
  }, [updateWeekData])

  const handleDeleteWeek = useCallback(async (weekId: string, weekNumber: number) => {
    if (!confirm(`Are you sure you want to delete Week ${weekNumber} and all its workouts? This cannot be undone.`)) {
      return
    }

    setDeletingWeekId(weekId)
    setError(null)

    try {
      // Delete the week (API will cascade delete all workouts and related data)
      const response = await fetch(`/api/weeks/${weekId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete week')
      }

      // Remove week from state and adjust pagination
      if (editMode) {
        setWeeksSummary(prev => {
          const updated = prev.filter(w => w.id !== weekId)
          if (currentWeekIndex >= updated.length && updated.length > 0) {
            setCurrentWeekIndex(updated.length - 1)
          }
          return updated
        })
        // Also remove from cache
        setWeeksCache(prev => {
          const newCache = new Map(prev)
          newCache.delete(weekNumber)
          return newCache
        })
      } else {
        setWeeks(prev => {
          const updated = prev.filter(w => w.id !== weekId)
          if (currentWeekIndex >= updated.length && updated.length > 0) {
            setCurrentWeekIndex(updated.length - 1)
          }
          return updated
        })
      }

      console.log('Week deleted successfully')
    } catch (error) {
      console.error('Error deleting week:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete week')
    } finally {
      setDeletingWeekId(null)
    }
  }, [editMode, currentWeekIndex])

  const handleDuplicateWeek = useCallback(async (weekId: string) => {
    setDuplicatingWeekId(weekId)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate week')
      }

      const { week: newWeek } = await response.json()

      // Add duplicated week to state and navigate to it
      if (editMode) {
        setWeeksSummary(prev => {
          const updated = [...prev, { id: newWeek.id, weekNumber: newWeek.weekNumber }]
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
        setWeeksCache(prev => new Map(prev).set(newWeek.weekNumber, newWeek))
      } else {
        setWeeks(prev => {
          const updated = [...prev, newWeek]
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
      }

      console.log('Week duplicated successfully')
    } catch (error) {
      console.error('Error duplicating week:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate week')
    } finally {
      setDuplicatingWeekId(null)
    }
  }, [editMode])

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

      // Add duplicated workout to the target week
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

      console.log('Workout duplicated successfully')
      setShowDuplicateWorkoutModal(false)
      setSelectedWorkoutForAction(null)
      setTargetWeekForDuplicate('')
    } catch (error) {
      console.error('Error duplicating workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate workout')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkoutForAction, targetWeekForDuplicate, editMode])

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

      // Move workout to target week
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

      console.log('Workout swapped successfully')
      setShowSwapWorkoutModal(false)
      setSelectedWorkoutForAction(null)
      setTargetWeekForSwap('')
    } catch (error) {
      console.error('Error swapping workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to swap workout')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkoutForAction, targetWeekForSwap, editMode])

  const handleDuplicateProgram = useCallback(async () => {
    if (!programId) return

    if (!confirm('Duplicate this program? A copy will be created with all weeks, workouts, and exercises.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate program')
      }

      const { program: duplicatedProgram } = await response.json()

      console.log('Program duplicated successfully:', duplicatedProgram)

      // Redirect to the new program
      router.push(`/programs/${duplicatedProgram.id}/edit`)
    } catch (error) {
      console.error('Error duplicating program:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate program')
    } finally {
      setIsLoading(false)
    }
  }, [programId, router])

  const toggleWorkoutCollapse = useCallback((workoutId: string) => {
    setCollapsedWorkouts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId)
      } else {
        newSet.add(workoutId)
      }
      return newSet
    })
  }, [])

  const handleExerciseSelect = useCallback(async (exercise: { id: string; name: string }, prescription: { sets: Array<{ setNumber: number; reps: string; intensityType: 'RIR' | 'RPE' | 'NONE'; intensityValue?: number }>; notes?: string }) => {
    if (!selectedWorkoutId) return

    setIsLoading(true)
    setError(null)

    try {
      if (editingExercise) {
        // Update existing exercise
        const response = await fetch(`/api/exercises/${editingExercise.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
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

        // Update the weeks state to include the updated exercise
        // Map the API response to match our Exercise type (exerciseDefinition.name -> name)
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
        // Add new exercise
        const response = await fetch(`/api/workouts/${selectedWorkoutId}/exercises`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

        // Update the weeks state to include the new exercise
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
  }, [selectedWorkoutId, editingExercise, updateWeekData])

  const closeExerciseModal = useCallback(() => {
    setShowExerciseModal(false)
    setSelectedWorkoutId(null)
    setEditingExercise(null)
  }, [])

  // Auto-save program details in edit mode
  const updateProgramDetails = useCallback(async () => {
    if (!editMode || !programId || !programName.trim()) return

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: programName.trim(),
          description: programDescription.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update program')
      }
    } catch (error) {
      console.error('Error updating program details:', error)
      setError(error instanceof Error ? error.message : 'Failed to update program')
    }
  }, [editMode, programId, programName, programDescription])

  // Debounce auto-save when program details change
  useEffect(() => {
    if (!editMode) return

    const timeoutId = setTimeout(() => {
      updateProgramDetails()
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [editMode, updateProgramDetails])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Program Form */}
        <div className="bg-card p-6 mb-6 doom-noise doom-card">
          <h2 className="text-xl font-semibold text-foreground mb-4 doom-heading">
            {editMode ? 'EDIT PROGRAM DETAILS' : 'PROGRAM DETAILS'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="programName" className="block text-sm font-medium text-foreground mb-1 doom-label">
                PROGRAM NAME *
              </label>
              <input
                id="programName"
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Enter program name"
                className="w-full doom-input"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="programDescription" className="block text-sm font-medium text-foreground mb-1 doom-label">
                DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                id="programDescription"
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
                placeholder="Describe your program goals and approach"
                rows={3}
                className="w-full doom-input"
                disabled={isLoading}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Type:</strong> Strength Training
            </div>

            {!editMode && !programId && (
              <button
                onClick={createProgram}
                disabled={isLoading || !programName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                {isLoading ? 'CREATING...' : 'CREATE PROGRAM'}
              </button>
            )}
            {editMode && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Program changes are saved automatically
                </div>
                <button
                  onClick={handleDuplicateProgram}
                  disabled={isLoading}
                  className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  {isLoading ? 'DUPLICATING...' : 'DUPLICATE PROGRAM'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-error-muted border border-error-border rounded-lg p-4 mb-6">
            <div className="text-error">{error}</div>
          </div>
        )}

        {/* Weeks Management */}
        {(programId || editMode) && (() => {
          // Get the appropriate weeks list based on mode
          const weeksList = editMode ? weeksSummary : weeks
          const totalWeeks = weeksList.length
          const currentWeekNumber = weeksList[currentWeekIndex]?.weekNumber
          const currentWeekData = editMode
            ? (currentWeekNumber ? weeksCache.get(currentWeekNumber) : null)
            : weeks[currentWeekIndex]

          return (
          <div className="bg-card p-3 sm:p-6 doom-noise doom-card">
            <h2 className="text-xl font-semibold text-foreground mb-4 doom-heading">TRAINING WEEKS</h2>

            {totalWeeks === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No weeks created yet</p>
                <button
                  onClick={() => addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-success text-success-foreground hover:bg-success-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  ADD WEEK 1
                </button>
              </div>
            ) : (
              <div className="space-y-6 overflow-visible">
                {/* Week Navigation */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <button
                    onClick={() => navigateToWeek(currentWeekIndex - 1)}
                    disabled={currentWeekIndex === 0 || isLoadingWeek}
                    className={`p-2 border shrink-0 ${
                      currentWeekIndex > 0 && !isLoadingWeek
                        ? 'border-border text-foreground hover:bg-muted doom-focus-ring'
                        : 'border-border/50 text-muted-foreground cursor-not-allowed opacity-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex-1 text-center">
                    <h3 className="text-lg font-bold text-foreground doom-heading">
                      WEEK {currentWeekIndex + 1} OF {totalWeeks}
                      {isLoadingWeek && <span className="ml-2 text-muted-foreground text-sm">Loading...</span>}
                    </h3>
                  </div>

                  <button
                    onClick={() => navigateToWeek(currentWeekIndex + 1)}
                    disabled={currentWeekIndex >= totalWeeks - 1 || isLoadingWeek}
                    className={`p-2 border shrink-0 ${
                      currentWeekIndex < totalWeeks - 1 && !isLoadingWeek
                        ? 'border-border text-foreground hover:bg-muted doom-focus-ring'
                        : 'border-border/50 text-muted-foreground cursor-not-allowed opacity-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Current Week Content */}
                {currentWeekData && (() => {
                  const week = currentWeekData
                  return (
                  <div key={week.id} className="border border-border p-2 sm:p-4 doom-noise doom-corners !overflow-visible">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground doom-heading">WEEK {week.weekNumber}</h3>

                        {/* Week Menu */}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              disabled={isLoading || deletingWeekId === week.id || duplicatingWeekId === week.id}
                              className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors disabled:opacity-50 uppercase tracking-wide"
                            >
                              {duplicatingWeekId === week.id ? 'Duplicating...' : 'Options'}
                            </button>
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="bg-card border border-border shadow-lg z-50 doom-corners overflow-hidden min-w-[200px]"
                              sideOffset={5}
                            >
                              <DropdownMenu.Item
                                onClick={() => handleDuplicateWeek(week.id)}
                                disabled={duplicatingWeekId === week.id}
                                className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none"
                              >
                                {duplicatingWeekId === week.id ? 'Duplicating...' : 'Duplicate Week'}
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                onClick={() => handleDeleteWeek(week.id, week.weekNumber)}
                                disabled={deletingWeekId === week.id}
                                className="px-4 py-2.5 text-sm text-error hover:bg-error hover:text-error-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                              >
                                {deletingWeekId === week.id ? 'Deleting...' : 'Delete Week'}
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>

                      <button
                        onClick={() => addWorkout(week.id)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-primary text-primary-foreground text-sm hover:bg-primary-hover disabled:opacity-50 doom-button-3d font-semibold uppercase"
                      >
                        ADD WORKOUT
                      </button>
                    </div>

                    {week.workouts.length === 0 ? (
                      <div className="text-muted-foreground text-sm py-2">No workouts yet</div>
                    ) : (
                      <div className="space-y-2 overflow-visible">
                        {week.workouts.map((workout) => {
                          const isCollapsed = collapsedWorkouts.has(workout.id)
                          return (
                            <div key={workout.id} className="bg-muted p-2 sm:p-3 doom-card relative !overflow-visible">
                              <div className="flex items-center justify-between mb-2">
                                {editingWorkoutId === workout.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editingWorkoutName}
                                    onChange={(e) => setEditingWorkoutName(e.target.value)}
                                    className="px-2 py-1 border border-input rounded text-sm flex-1 bg-muted text-foreground"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveWorkoutName(workout.id)
                                      } else if (e.key === 'Escape') {
                                        handleCancelWorkoutEdit()
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveWorkoutName(workout.id)}
                                    disabled={isLoading}
                                    className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary-hover disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelWorkoutEdit}
                                    className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary-hover"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    onClick={() => toggleWorkoutCollapse(workout.id)}
                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  <span className="font-medium text-foreground doom-heading">{workout.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    ({workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}, {workout.exercises.reduce((sum, ex) => sum + ex.prescribedSets.length, 0)} sets)
                                  </span>

                                  {/* Workout Menu */}
                                  <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                      <button
                                        disabled={isLoading || deletingWorkoutId === workout.id}
                                        className="p-1.5 sm:px-2 sm:py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors disabled:opacity-50 uppercase tracking-wide"
                                      >
                                        <MoreVertical size={14} className="sm:hidden" />
                                        <span className="hidden sm:inline">Options</span>
                                      </button>
                                    </DropdownMenu.Trigger>

                                    <DropdownMenu.Portal>
                                      <DropdownMenu.Content
                                        className="bg-card border border-border shadow-lg z-50 doom-corners overflow-hidden min-w-[150px]"
                                        sideOffset={5}
                                      >
                                        <DropdownMenu.Item
                                          onClick={() => handleStartWorkoutEdit(workout.id, workout.name)}
                                          className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer outline-none"
                                        >
                                          Rename
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                          onClick={() => {
                                            setSelectedWorkoutForAction({ id: workout.id, name: workout.name })
                                            setShowDuplicateWorkoutModal(true)
                                          }}
                                          disabled={isLoading}
                                          className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                                        >
                                          Duplicate
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                          onClick={() => {
                                            setSelectedWorkoutForAction({ id: workout.id, name: workout.name })
                                            setShowSwapWorkoutModal(true)
                                          }}
                                          disabled={isLoading}
                                          className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                                        >
                                          Move to Week
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                          onClick={() => handleDeleteWorkout(workout.id, workout.name)}
                                          disabled={deletingWorkoutId === workout.id}
                                          className="px-4 py-2.5 text-sm text-error hover:bg-error hover:text-error-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                                        >
                                          {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete'}
                                        </DropdownMenu.Item>
                                      </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                  </DropdownMenu.Root>
                                </div>
                              )}
                            </div>
                            
                            {!isCollapsed && (
                              <>
                                {workout.exercises.length === 0 ? (
                                  <div className="text-muted-foreground text-xs mb-2">No exercises yet</div>
                                ) : (
                                  <SortableExerciseList
                                    exercises={workout.exercises}
                                    workoutId={workout.id}
                                    onReorder={handleReorderExercises}
                                    onEditExercise={(exercise) => handleEditExercise(exercise, workout.id)}
                                    onDeleteExercise={handleDeleteExercise}
                                    deletingExerciseId={deletingExerciseId}
                                    isLoading={isLoading}
                                  />
                                )}
                                <button
                                  onClick={() => handleAddExercise(workout.id)}
                                  disabled={isLoading || deletingWorkoutId === workout.id}
                                  className="w-full py-1.5 bg-success/80 hover:bg-success text-success-foreground text-xs font-semibold uppercase tracking-wide disabled:opacity-50 transition-colors"
                                >
                                  + Add Exercise
                                </button>
                              </>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  )
                })()}

                <button
                  onClick={() => addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-success text-success-foreground hover:bg-success-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  ADD WEEK {totalWeeks + 1}
                </button>
              </div>
            )}

            {(programId || editMode) && totalWeeks > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-success text-success-foreground hover:bg-success-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
                >
                  {editMode ? 'DONE EDITING' : 'COMPLETE & VIEW PROGRAM'}
                </button>
              </div>
            )}
          </div>
          )
        })()}
      </div>

      {/* Sidebar - FAU Visualization */}
      <div className="lg:col-span-1">
        <FAUVolumeVisualization week={getCurrentWeekData()} />
      </div>

      {/* Exercise Search Modal */}
      <ExerciseSearchModal
        isOpen={showExerciseModal}
        onClose={closeExerciseModal}
        onExerciseSelect={handleExerciseSelect}
        editingExercise={editingExercise}
      />

      {/* Duplicate Workout Modal */}
      {showDuplicateWorkoutModal && selectedWorkoutForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 doom-corners">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Duplicate "{selectedWorkoutForAction.name}"
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the week to duplicate this workout into:
            </p>
            <select
              value={targetWeekForDuplicate}
              onChange={(e) => setTargetWeekForDuplicate(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground mb-4"
            >
              <option value="">Select a week...</option>
              {(editMode ? weeksSummary : weeks).map(week => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDuplicateWorkoutModal(false)
                  setSelectedWorkoutForAction(null)
                  setTargetWeekForDuplicate('')
                }}
                className="px-4 py-2 text-foreground bg-card border border-input rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateWorkout}
                disabled={!targetWeekForDuplicate || isLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {isLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Workout Modal */}
      {showSwapWorkoutModal && selectedWorkoutForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 doom-corners">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Move "{selectedWorkoutForAction.name}"
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the week to move this workout to:
            </p>
            <select
              value={targetWeekForSwap}
              onChange={(e) => setTargetWeekForSwap(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground mb-4"
            >
              <option value="">Select a week...</option>
              {(editMode ? weeksSummary : weeks).map(week => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSwapWorkoutModal(false)
                  setSelectedWorkoutForAction(null)
                  setTargetWeekForSwap('')
                }}
                className="px-4 py-2 text-foreground bg-card border border-input rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSwapWorkout}
                disabled={!targetWeekForSwap || isLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {isLoading ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}