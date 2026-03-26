'use client'

import { useCallback, useEffect, useState } from 'react'

export type LoggedSet = {
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup?: boolean
}

type StoredWorkoutData = {
  loggedSets: LoggedSet[]
  timestamp: number
  workoutId: string
  lastModified: number
}

const WORKOUT_STORAGE_TTL = 14 * 24 * 60 * 60 * 1000 // 14 days in milliseconds

/**
 * Custom hook for workout data persistence with localStorage backing
 * Provides automatic saving, loading, and TTL-based cleanup
 */
export function useWorkoutStorage(workoutId: string) {
  const [loggedSets, setLoggedSetsInternal] = useState<LoggedSet[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const getStorageKey = useCallback((id: string) => `workout-${id}`, [])

  // Clean expired workouts from localStorage
  const cleanupExpiredWorkouts = useCallback(() => {
    if (typeof window === 'undefined') return

    const now = Date.now()
    const keysToRemove: string[] = []

    // Check all workout keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('workout-')) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const { timestamp }: StoredWorkoutData = JSON.parse(stored)
            if (now - timestamp > WORKOUT_STORAGE_TTL) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // Invalid JSON, remove it
          keysToRemove.push(key)
        }
      }
    }

    // Remove expired items
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} expired workout(s) from localStorage`)
    }
  }, [])

  // Load workout data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const loadData = async () => {
      // Clean up expired workouts first
      cleanupExpiredWorkouts()

      const storageKey = getStorageKey(workoutId)
      const stored = localStorage.getItem(storageKey)

      if (stored && mounted) {
        try {
          const { loggedSets: storedSets, timestamp }: StoredWorkoutData = JSON.parse(stored)
          
          // Check if data is expired
          if (Date.now() - timestamp <= WORKOUT_STORAGE_TTL) {
            if (mounted) {
              setLoggedSetsInternal(storedSets || [])
              console.log(`Loaded ${storedSets?.length || 0} sets from localStorage for workout ${workoutId}`)
            }
          } else {
            // Expired data, remove it
            localStorage.removeItem(storageKey)
            console.log(`Removed expired data for workout ${workoutId}`)
          }
        } catch (parseError) {
          console.error('Error parsing stored workout data:', parseError)
          localStorage.removeItem(storageKey)
        }
      }

      if (mounted) {
        setIsLoaded(true)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [workoutId, getStorageKey, cleanupExpiredWorkouts])

  // Save to localStorage whenever loggedSets changes
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return

    const storageKey = getStorageKey(workoutId)

    if (loggedSets.length > 0) {
      const dataToStore: StoredWorkoutData = {
        loggedSets,
        timestamp: Date.now(),
        workoutId,
        lastModified: Date.now()
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToStore))
        console.log(`💾 Saved ${loggedSets.length} sets to localStorage for workout ${workoutId}`)
      } catch (error) {
        console.error('❌ Error saving workout to localStorage:', error)
        console.log('🧹 Attempting cleanup and retry...')
        // Could be quota exceeded - maybe clean up old workouts and try again
        cleanupExpiredWorkouts()
        try {
          localStorage.setItem(storageKey, JSON.stringify(dataToStore))
          console.log('✅ Retry successful after cleanup')
        } catch (retryError) {
          console.error('❌ Error saving workout after cleanup:', retryError)
          console.error('🚨 CRITICAL: Cannot save workout data locally - data may be lost!')
        }
      }
    } else {
      // If no sets, remove from localStorage (but keep until workout completion)
      // This prevents accumulating empty workout entries
    }
  }, [loggedSets, workoutId, isLoaded, getStorageKey, cleanupExpiredWorkouts])

  // Enhanced setLoggedSets that tracks modifications
  const setLoggedSets = useCallback((newSets: LoggedSet[] | ((prev: LoggedSet[]) => LoggedSet[])) => {
    setLoggedSetsInternal(newSets)
  }, [])

  // Clear workout data from localStorage (call after successful completion)
  const clearStoredWorkout = useCallback(() => {
    if (typeof window === 'undefined') return

    const storageKey = getStorageKey(workoutId)
    localStorage.removeItem(storageKey)
    console.log(`Cleared stored data for workout ${workoutId}`)
  }, [workoutId, getStorageKey])

  // Get storage info for debugging
  const getStorageInfo = useCallback(() => {
    if (typeof window === 'undefined') return null

    const storageKey = getStorageKey(workoutId)
    const stored = localStorage.getItem(storageKey)
    
    if (!stored) return null

    try {
      const data: StoredWorkoutData = JSON.parse(stored)
      return {
        setsCount: data.loggedSets.length,
        lastModified: new Date(data.lastModified),
        age: Date.now() - data.timestamp,
        sizeBytes: new Blob([stored]).size
      }
    } catch {
      return null
    }
  }, [workoutId, getStorageKey])

  return {
    loggedSets,
    setLoggedSets,
    isLoaded,
    clearStoredWorkout,
    getStorageInfo
  }
}