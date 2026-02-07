'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type PrescribedSet = {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

export type Exercise = {
  id: string
  name: string
  order: number
  exerciseGroup: string | null
  notes: string | null
  isOneOff?: boolean
  prescribedSets: PrescribedSet[]
  exerciseDefinitionId: string
  exerciseDefinition?: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
    equipment: string[]
    instructions?: string
    isSystem: boolean
    createdBy: string | null
  }
}

export type ExerciseHistorySet = {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

export type ExerciseHistory = {
  completedAt: Date
  workoutName: string
  sets: ExerciseHistorySet[]
}

export type LoadState = 'pending' | 'loading' | 'loaded' | 'error'

export interface UseProgressiveExercisesOptions {
  initialExercise?: Exercise | null
  initialHistory?: ExerciseHistory | null
}

export interface UseProgressiveExercisesResult {
  currentExercise: Exercise | null
  currentExerciseState: LoadState
  currentIndex: number
  totalExercises: number
  goToExercise: (index: number) => void
  goToNext: () => void
  goToPrevious: () => void
  loadedExercises: Map<number, Exercise>
  currentExerciseHistory: ExerciseHistory | null
  currentHistoryState: LoadState
  hasHistoryForCurrentExercise: boolean
  refreshExercises: () => void
  allExercisesLoaded: boolean
}

interface ExerciseApiResponse {
  exercise: Exercise | null
  hasNext: boolean
  hasPrevious: boolean
  totalExercises: number
}

interface HistoryApiResponse {
  history: ExerciseHistory | null
}

/**
 * Hook for progressively loading exercises for workout logging
 * Accepts optional initial exercise + history to avoid extra round trips
 */
export function useProgressiveExercises(
  workoutId: string,
  exerciseCount: number,
  completionId?: string,
  options?: UseProgressiveExercisesOptions
): UseProgressiveExercisesResult {
  const { initialExercise, initialHistory } = options || {}

  // Initialize state with initial data if provided
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalExercises, setTotalExercises] = useState(exerciseCount)

  const [loadedExercises, setLoadedExercises] = useState<Map<number, Exercise>>(() => {
    if (initialExercise) {
      return new Map([[0, initialExercise]])
    }
    return new Map()
  })

  const [exerciseLoadStates, setExerciseLoadStates] = useState<Map<number, LoadState>>(() => {
    if (initialExercise) {
      return new Map([[0, 'loaded']])
    }
    return new Map()
  })

  const [historyByExerciseId, setHistoryByExerciseId] = useState<Map<string, ExerciseHistory | null>>(() => {
    if (initialExercise) {
      return new Map([[initialExercise.id, initialHistory ?? null]])
    }
    return new Map()
  })

  const [historyLoadStates, setHistoryLoadStates] = useState<Map<string, LoadState>>(() => {
    if (initialExercise) {
      return new Map([[initialExercise.id, 'loaded']])
    }
    return new Map()
  })

  const prefetchingRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(true)

  // Sync totalExercises with exerciseCount prop (handles add/delete)
  useEffect(() => {
    if (exerciseCount !== totalExercises) {
      setTotalExercises(exerciseCount)

      if (currentIndex >= exerciseCount && exerciseCount > 0) {
        setCurrentIndex(exerciseCount - 1)
      }
    }
  }, [exerciseCount, totalExercises, currentIndex])

  const fetchExercise = useCallback(async (order: number): Promise<Exercise | null> => {
    if (order < 1 || order > totalExercises) return null

    const url = `/api/workouts/${workoutId}/exercises/${order}${completionId ? `?completionId=${completionId}` : ''}`

    try {
      const response = await fetch(url)
      if (!response.ok) return null

      const data: ExerciseApiResponse = await response.json()

      if (data.totalExercises !== totalExercises) {
        setTotalExercises(data.totalExercises)
      }

      return data.exercise
    } catch (error) {
      console.error(`Error fetching exercise at order ${order}:`, error)
      return null
    }
  }, [workoutId, completionId, totalExercises])

  const fetchHistory = useCallback(async (exerciseId: string): Promise<ExerciseHistory | null> => {
    try {
      const response = await fetch(`/api/exercises/${exerciseId}/history`)
      if (!response.ok) return null

      const data: HistoryApiResponse = await response.json()
      return data.history
    } catch (error) {
      console.error(`Error fetching history for exercise ${exerciseId}:`, error)
      return null
    }
  }, [])

  const loadExerciseWithHistory = useCallback(async (index: number) => {
    const order = index + 1
    const prefetchKey = `exercise-${index}`

    if (prefetchingRef.current.has(prefetchKey)) return
    if (loadedExercises.has(index) && exerciseLoadStates.get(index) === 'loaded') {
      // Exercise already loaded, check if we need history
      const exercise = loadedExercises.get(index)
      if (exercise && !historyByExerciseId.has(exercise.id) && historyLoadStates.get(exercise.id) !== 'loading') {
        const historyKey = `history-${exercise.id}`
        if (!prefetchingRef.current.has(historyKey)) {
          prefetchingRef.current.add(historyKey)
          setHistoryLoadStates(prev => new Map(prev).set(exercise.id, 'loading'))

          const history = await fetchHistory(exercise.id)

          if (mountedRef.current) {
            setHistoryByExerciseId(prev => new Map(prev).set(exercise.id, history))
            setHistoryLoadStates(prev => new Map(prev).set(exercise.id, 'loaded'))
          }
          prefetchingRef.current.delete(historyKey)
        }
      }
      return
    }

    prefetchingRef.current.add(prefetchKey)
    setExerciseLoadStates(prev => new Map(prev).set(index, 'loading'))

    const exercise = await fetchExercise(order)

    if (!mountedRef.current) {
      prefetchingRef.current.delete(prefetchKey)
      return
    }

    if (exercise) {
      setLoadedExercises(prev => new Map(prev).set(index, exercise))
      setExerciseLoadStates(prev => new Map(prev).set(index, 'loaded'))

      const historyKey = `history-${exercise.id}`
      prefetchingRef.current.add(historyKey)
      setHistoryLoadStates(prev => new Map(prev).set(exercise.id, 'loading'))

      const history = await fetchHistory(exercise.id)

      if (mountedRef.current) {
        setHistoryByExerciseId(prev => new Map(prev).set(exercise.id, history))
        setHistoryLoadStates(prev => new Map(prev).set(exercise.id, 'loaded'))
      }
      prefetchingRef.current.delete(historyKey)
    } else {
      setExerciseLoadStates(prev => new Map(prev).set(index, 'error'))
    }

    prefetchingRef.current.delete(prefetchKey)
  }, [loadedExercises, exerciseLoadStates, historyByExerciseId, historyLoadStates, fetchExercise, fetchHistory])

  const prefetchSequentially = useCallback(async (startIndex: number) => {
    const indicesToLoad = [startIndex, startIndex + 1, startIndex + 2, startIndex + 3]

    for (const index of indicesToLoad) {
      if (index >= totalExercises) break
      if (!mountedRef.current) break

      await loadExerciseWithHistory(index)
    }
  }, [totalExercises, loadExerciseWithHistory])

  useEffect(() => {
    mountedRef.current = true
    prefetchSequentially(currentIndex)

    return () => {
      mountedRef.current = false
    }
  }, [currentIndex, prefetchSequentially])

  const goToExercise = useCallback((index: number) => {
    if (index < 0 || index >= totalExercises) return
    setCurrentIndex(index)
  }, [totalExercises])

  const goToNext = useCallback(() => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, totalExercises])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const refreshExercises = useCallback(() => {
    setLoadedExercises(new Map())
    setExerciseLoadStates(new Map())
    setHistoryByExerciseId(new Map())
    setHistoryLoadStates(new Map())
    prefetchingRef.current.clear()

    prefetchSequentially(currentIndex)
  }, [currentIndex, prefetchSequentially])

  const currentExercise = loadedExercises.get(currentIndex) || null
  const currentExerciseState = exerciseLoadStates.get(currentIndex) || 'pending'

  const currentExerciseHistory = currentExercise
    ? historyByExerciseId.get(currentExercise.id) ?? null
    : null
  const currentHistoryState = currentExercise
    ? historyLoadStates.get(currentExercise.id) || 'pending'
    : 'pending'

  const hasHistoryForCurrentExercise = currentExercise
    ? historyByExerciseId.has(currentExercise.id) && historyByExerciseId.get(currentExercise.id) !== null
    : false

  const allExercisesLoaded = loadedExercises.size >= totalExercises

  return {
    currentExercise,
    currentExerciseState,
    currentIndex,
    totalExercises,
    goToExercise,
    goToNext,
    goToPrevious,
    loadedExercises,
    currentExerciseHistory,
    currentHistoryState,
    hasHistoryForCurrentExercise,
    refreshExercises,
    allExercisesLoaded,
  }
}
