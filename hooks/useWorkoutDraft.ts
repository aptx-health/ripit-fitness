'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDraftSet,
  deleteDraftSet,
  fetchDraft,
} from '@/lib/api/workout-sets'
import type { LoggedSet } from '@/types/workout'

const STORAGE_KEY_PREFIX = 'workout-'

function getStorageKey(workoutId: string): string {
  return `${STORAGE_KEY_PREFIX}${workoutId}`
}

function readLocalCache(workoutId: string): LoggedSet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getStorageKey(workoutId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return parsed.loggedSets || []
  } catch {
    return []
  }
}

function writeLocalCache(workoutId: string, sets: LoggedSet[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      getStorageKey(workoutId),
      JSON.stringify({ loggedSets: sets, timestamp: Date.now() })
    )
  } catch {
    // Storage full — non-critical, DB is the source of truth
  }
}

function clearLocalCache(workoutId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(getStorageKey(workoutId))
  } catch {
    // Non-critical
  }
}

type UseWorkoutDraftReturn = {
  loggedSets: LoggedSet[]
  isHydrating: boolean
  failedSetCount: number
  isOnline: boolean
  completionId: string | null
  logSet: (set: Omit<LoggedSet, 'id' | '_syncStatus'>) => void
  deleteSet: (setId: string | undefined, exerciseId: string, setNumber: number) => void
  retrySet: (exerciseId: string, setNumber: number) => void
  flushFailedSets: () => Promise<void>
  clearCache: () => void
}

export function useWorkoutDraft(workoutId: string): UseWorkoutDraftReturn {
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const [isHydrating, setIsHydrating] = useState(true)
  const [completionId, setCompletionId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true)

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Hydrate from DB on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const draft = await fetchDraft(workoutId)

        if (cancelled) return

        if (draft) {
          // Check localStorage for sets that failed to persist (offline/error recovery)
          const cached = readLocalCache(workoutId)
          const dbSetKeys = new Set(
            draft.sets.map(s => `${s.exerciseId}:${s.setNumber}`)
          )
          const unsyncedSets = cached.filter(
            s => !dbSetKeys.has(`${s.exerciseId}:${s.setNumber}`)
          )

          if (unsyncedSets.length > 0) {
            // Merge: DB sets (synced) + unsynced local sets (pending)
            const merged = [
              ...draft.sets,
              ...unsyncedSets.map(s => ({ ...s, _syncStatus: 'pending' as const })),
            ]
            setLoggedSets(merged)
            setCompletionId(draft.completionId)
            // Try to persist the unsynced sets
            migrateCachedSets(unsyncedSets)
          } else {
            setLoggedSets(draft.sets)
            setCompletionId(draft.completionId)
            writeLocalCache(workoutId, draft.sets)
          }
        } else {
          // No draft in DB — check localStorage for crash recovery
          const cached = readLocalCache(workoutId)
          if (cached.length > 0) {
            setLoggedSets(cached.map(s => ({ ...s, _syncStatus: 'pending' as const })))
            migrateCachedSets(cached)
          }
        }
      } catch {
        // DB fetch failed (offline?) — fall back to localStorage
        const cached = readLocalCache(workoutId)
        if (cached.length > 0 && !cancelled) {
          setLoggedSets(cached)
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false)
        }
      }
    }

    async function migrateCachedSets(cached: LoggedSet[]) {
      for (const set of cached) {
        if (!mountedRef.current) return
        try {
          const result = await createDraftSet(workoutId, {
            exerciseId: set.exerciseId,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            weightUnit: set.weightUnit,
            rpe: set.rpe,
            rir: set.rir,
            isWarmup: set.isWarmup,
          })

          if (!mountedRef.current) return

          setCompletionId(result.completionId)
          setLoggedSets(prev =>
            prev.map(s =>
              s.exerciseId === set.exerciseId && s.setNumber === set.setNumber
                ? { ...s, id: result.set.id, _syncStatus: 'synced' as const }
                : s
            )
          )
        } catch {
          if (!mountedRef.current) return
          setLoggedSets(prev =>
            prev.map(s =>
              s.exerciseId === set.exerciseId && s.setNumber === set.setNumber
                ? { ...s, _syncStatus: 'error' as const }
                : s
            )
          )
        }
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [workoutId])

  // Write-through cache: mirror state to localStorage on every change
  useEffect(() => {
    if (isHydrating) return
    if (loggedSets.length > 0) {
      writeLocalCache(workoutId, loggedSets)
    }
  }, [loggedSets, workoutId, isHydrating])

  // Track mount state — must reset to true for StrictMode remount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const logSet = useCallback(
    (set: Omit<LoggedSet, 'id' | '_syncStatus'>) => {
      const pendingSet: LoggedSet = { ...set, _syncStatus: 'pending' }

      // Optimistic UI update
      setLoggedSets(prev => [...prev, pendingSet])

      // Fire API call
      createDraftSet(workoutId, set)
        .then(result => {
          if (!mountedRef.current) return
          setCompletionId(result.completionId)
          setLoggedSets(prev =>
            prev.map(s =>
              s.exerciseId === set.exerciseId && s.setNumber === set.setNumber && s._syncStatus === 'pending'
                ? { ...s, id: result.set.id, _syncStatus: 'synced' }
                : s
            )
          )
        })
        .catch(() => {
          if (!mountedRef.current) return
          setLoggedSets(prev =>
            prev.map(s =>
              s.exerciseId === set.exerciseId && s.setNumber === set.setNumber && s._syncStatus === 'pending'
                ? { ...s, _syncStatus: 'error' }
                : s
            )
          )
        })
    },
    [workoutId]
  )

  const deleteSet = useCallback(
    (setId: string | undefined, exerciseId: string, setNumber: number) => {
      // Optimistic remove
      setLoggedSets(prev => {
        const filtered = prev.filter(
          s => !(s.exerciseId === exerciseId && s.setNumber === setNumber)
        )
        // Renumber remaining sets for this exercise locally
        let num = 1
        return filtered.map(s => {
          if (s.exerciseId === exerciseId) {
            return { ...s, setNumber: num++ }
          }
          return s
        })
      })

      // Fire API call if set has a DB id
      if (setId) {
        deleteDraftSet(workoutId, setId)
          .catch(() => {
            if (!mountedRef.current) return
            // Re-add the set on failure
            setLoggedSets(prev => [
              ...prev,
              { exerciseId, setNumber, reps: 0, weight: 0, weightUnit: 'lbs', rpe: null, rir: null, id: setId, _syncStatus: 'error' },
            ])
          })
      }
    },
    [workoutId]
  )

  const retrySet = useCallback(
    (exerciseId: string, setNumber: number) => {
      const set = loggedSets.find(
        s => s.exerciseId === exerciseId && s.setNumber === setNumber && s._syncStatus === 'error'
      )
      if (!set) return

      // Mark as pending
      setLoggedSets(prev =>
        prev.map(s =>
          s.exerciseId === exerciseId && s.setNumber === setNumber
            ? { ...s, _syncStatus: 'pending' }
            : s
        )
      )

      createDraftSet(workoutId, {
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
        weightUnit: set.weightUnit,
        rpe: set.rpe,
        rir: set.rir,
        isWarmup: set.isWarmup,
      })
        .then(result => {
          if (!mountedRef.current) return
          setCompletionId(result.completionId)
          setLoggedSets(prev =>
            prev.map(s =>
              s.exerciseId === exerciseId && s.setNumber === setNumber
                ? { ...s, id: result.set.id, _syncStatus: 'synced' }
                : s
            )
          )
        })
        .catch(() => {
          if (!mountedRef.current) return
          setLoggedSets(prev =>
            prev.map(s =>
              s.exerciseId === exerciseId && s.setNumber === setNumber
                ? { ...s, _syncStatus: 'error' }
                : s
            )
          )
        })
    },
    [workoutId, loggedSets]
  )

  // Attempt to persist any failed/pending sets before closing
  const flushFailedSets = useCallback(async () => {
    const failed = loggedSets.filter(s => s._syncStatus === 'error' || s._syncStatus === 'pending')
    for (const set of failed) {
      try {
        const result = await createDraftSet(workoutId, {
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          rpe: set.rpe,
          rir: set.rir,
          isWarmup: set.isWarmup,
        })
        if (!mountedRef.current) return
        setCompletionId(result.completionId)
      } catch {
        // Best effort — localStorage still has the set for next time
      }
    }
  }, [workoutId, loggedSets])

  const clearCache = useCallback(() => {
    clearLocalCache(workoutId)
  }, [workoutId])

  const failedSetCount = loggedSets.filter(s => s._syncStatus === 'error').length

  return {
    loggedSets,
    isHydrating,
    failedSetCount,
    isOnline,
    completionId,
    logSet,
    deleteSet,
    retrySet,
    flushFailedSets,
    clearCache,
  }
}
