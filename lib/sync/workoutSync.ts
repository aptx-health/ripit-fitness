'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoggedSet } from '@/hooks/useWorkoutStorage'

export type SyncBatch = {
  sets: LoggedSet[]
  workoutId: string
  timestamp: number
  attempt: number
}

export type SyncOptions = {
  maxRetries?: number
  baseDelay?: number
  syncThreshold?: number
}

export type SyncCallbacks = {
  onSyncStart?: (pendingCount: number) => void
  onSyncSuccess?: (syncedCount: number) => void
  onSyncError?: (error: string, willRetry: boolean) => void
  onRetryStart?: () => void
}

/**
 * Background sync service for workout data
 * Manages queuing, batching, and retry logic for syncing sets to server
 */
export class WorkoutSyncService {
  private pendingQueue: LoggedSet[] = []
  private allCurrentSets: LoggedSet[] = [] // Track all accumulated sets
  private isCurrentlySyncing = false
  private retryTimeouts: Set<NodeJS.Timeout> = new Set()
  private callbacks: SyncCallbacks = {}
  private options: Required<SyncOptions>

  constructor(callbacks: SyncCallbacks = {}, options: SyncOptions = {}) {
    this.callbacks = { ...callbacks }
    this.options = {
      maxRetries: 3,
      baseDelay: 2000, // 2 seconds
      syncThreshold: 3, // Sync every 3 sets
      ...options
    }

    // Listen for page visibility changes to trigger sync
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
      window.addEventListener('beforeunload', this.handleBeforeUnload)
    }
  }

  /**
   * Update callbacks (used by the hook)
   */
  updateCallbacks = (newCallbacks: SyncCallbacks): void => {
    this.callbacks = { ...newCallbacks }
  }

  /**
   * Add sets to the pending queue and trigger sync if threshold is reached
   * @param sets - New sets to add to queue
   * @param workoutId - Workout ID for syncing
   * @param allCurrentSets - All accumulated sets (for full state sync)
   */
  addSets = (sets: LoggedSet[], workoutId: string, allCurrentSets: LoggedSet[]): void => {
    this.pendingQueue.push(...sets)
    this.allCurrentSets = allCurrentSets // Update full state
    console.log(`Added ${sets.length} set(s) to sync queue. Queue length: ${this.pendingQueue.length}`)
    console.log(`Total accumulated sets: ${this.allCurrentSets.length}`)
    console.log('Current options:', this.options)
    console.log('Threshold check:', this.pendingQueue.length, '>=', this.options.syncThreshold)

    // Trigger sync if we've reached the threshold
    if (this.pendingQueue.length >= this.options.syncThreshold) {
      console.log('Threshold reached, triggering sync with all', this.allCurrentSets.length, 'sets')
      this.syncNow(workoutId)
    } else {
      console.log('Threshold not reached yet, waiting for more sets')
    }
  }

  /**
   * Force immediate sync of all pending sets
   */
  syncNow = async (workoutId: string): Promise<void> => {
    console.log('syncNow called with workoutId:', workoutId, 'queue length:', this.pendingQueue.length)
    
    if (this.isCurrentlySyncing) {
      console.log('Sync already in progress, skipping manual sync')
      return
    }

    await this.attemptSync(workoutId, 0)
  }

  /**
   * Force immediate sync with current workout state (for manual sync button)
   */
  syncCurrentState = async (workoutId: string, currentSets: LoggedSet[]): Promise<void> => {
    console.log('🔄 syncCurrentState called with workoutId:', workoutId, 'currentSets:', currentSets.length)
    
    // Input validation
    if (!workoutId || typeof workoutId !== 'string') {
      console.error('❌ Invalid workoutId provided to syncCurrentState:', workoutId)
      this.callbacks.onSyncError?.('Invalid workout ID', false)
      return
    }

    if (!Array.isArray(currentSets)) {
      console.error('❌ Invalid currentSets provided to syncCurrentState:', currentSets)
      this.callbacks.onSyncError?.('Invalid sets data', false)
      return
    }
    
    if (this.isCurrentlySyncing) {
      console.log('⏳ Sync already in progress, skipping manual sync')
      return
    }

    // Validate set data before sending
    const invalidSets = currentSets.filter(set => 
      !set.exerciseId || 
      typeof set.setNumber !== 'number' || 
      typeof set.reps !== 'number' ||
      typeof set.weight !== 'number'
    )

    if (invalidSets.length > 0) {
      console.error('❌ Invalid set data detected:', invalidSets)
      this.callbacks.onSyncError?.('Invalid set data structure', false)
      return
    }

    console.log('✅ Data validation passed, proceeding with sync')
    await this.attemptSyncWithSets(workoutId, currentSets, 0)
  }

  /**
   * Sync all remaining sets (typically called on workout completion)
   */
  syncRemaining = async (workoutId: string): Promise<void> => {
    if (this.pendingQueue.length === 0) {
      return
    }

    console.log(`Syncing ${this.pendingQueue.length} remaining sets for workout completion`)
    await this.syncNow(workoutId)
  }

  /**
   * Attempt to sync with specific sets (for manual sync)
   */
  private attemptSyncWithSets = async (workoutId: string, sets: LoggedSet[], retryCount: number): Promise<void> => {
    if (this.isCurrentlySyncing) {
      console.log('Sync already in progress, skipping')
      return
    }

    this.isCurrentlySyncing = true
    const willRetry = retryCount < this.options.maxRetries

    console.log(`🔄 Manual sync attempt ${retryCount + 1} for ${sets.length} sets to workoutId: ${workoutId}`)

    try {
      console.log('📞 Calling onSyncStart callback')
      this.callbacks.onSyncStart?.(sets.length)

      // Enhanced safety logging for the payload
      if (sets.length === 0) {
        console.warn('⚠️ CRITICAL: Sending empty sets array - this will DELETE all server data')
      }

      // Call the draft API to save current progress
      console.log('📡 Making API call to:', `/api/workouts/${workoutId}/draft`)
      console.log('📦 Payload summary:', { 
        setCount: sets.length, 
        exercises: [...new Set(sets.map(s => s.exerciseId))].length,
        operation: sets.length === 0 ? 'DELETION' : 'SYNC'
      })
      
      const response = await fetch(`/api/workouts/${workoutId}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loggedSets: sets
        })
      })
      
      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      // Success - for manual sync, don't clear pending queue since it's separate
      this.callbacks.onSyncSuccess?.(sets.length)

      console.log(`Successfully synced ${sets.length} sets manually`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      console.error(`Manual sync attempt ${retryCount + 1} failed:`, errorMessage)

      this.callbacks.onSyncError?.(errorMessage, willRetry)

      if (willRetry) {
        // Schedule retry with exponential backoff
        const delay = this.options.baseDelay * Math.pow(2, retryCount)
        console.log(`Scheduling manual retry ${retryCount + 2} in ${delay}ms`)

        const timeout = setTimeout(() => {
          this.retryTimeouts.delete(timeout)
          this.callbacks.onRetryStart?.()
          this.attemptSyncWithSets(workoutId, sets, retryCount + 1)
        }, delay)

        this.retryTimeouts.add(timeout)
      }
    } finally {
      this.isCurrentlySyncing = false
    }
  }

  /**
   * Attempt to sync current batch with retry logic
   * IMPORTANT: Sends ALL accumulated sets, not just pending queue
   * This prevents data loss when draft API deletes and recreates sets
   */
  private attemptSync = async (workoutId: string, retryCount: number): Promise<void> => {
    if (this.isCurrentlySyncing) {
      console.log('Sync already in progress, skipping')
      return
    }

    this.isCurrentlySyncing = true
    const pendingCount = this.pendingQueue.length // Track for queue management
    const setsToSync = [...this.allCurrentSets] // Send ALL accumulated sets
    const willRetry = retryCount < this.options.maxRetries

    console.log(`Sync attempt ${retryCount + 1}: Sending ${setsToSync.length} total sets (${pendingCount} pending) to workoutId: ${workoutId}`)

    try {
      console.log('Calling onSyncStart callback')
      this.callbacks.onSyncStart?.(pendingCount)

      // Call the draft API to save current progress
      // CRITICAL: Send ALL accumulated sets so draft API replacement pattern works correctly
      console.log('Making API call to:', `/api/workouts/${workoutId}/draft`)
      console.log('With payload:', { loggedSets: setsToSync })

      const response = await fetch(`/api/workouts/${workoutId}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loggedSets: setsToSync
        })
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      // Success - clear pending queue (we've synced all current sets)
      this.pendingQueue = []
      this.callbacks.onSyncSuccess?.(pendingCount)

      console.log(`Successfully synced ${setsToSync.length} total sets. Queue cleared.`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      console.error(`Sync attempt ${retryCount + 1} failed:`, errorMessage)

      this.callbacks.onSyncError?.(errorMessage, willRetry)

      if (willRetry) {
        // Schedule retry with exponential backoff
        const delay = this.options.baseDelay * Math.pow(2, retryCount)
        console.log(`Scheduling retry ${retryCount + 2} in ${delay}ms`)

        const timeout = setTimeout(() => {
          this.retryTimeouts.delete(timeout)
          this.callbacks.onRetryStart?.()
          this.attemptSync(workoutId, retryCount + 1)
        }, delay)

        this.retryTimeouts.add(timeout)
      }
    } finally {
      this.isCurrentlySyncing = false
    }
  }

  /**
   * Manual retry of failed sync (called from UI)
   */
  retrySync = (workoutId: string): void => {
    if (this.pendingQueue.length === 0) {
      return
    }

    // Clear any existing retry timeouts
    this.clearRetryTimeouts()
    
    console.log('Manual retry triggered')
    this.callbacks.onRetryStart?.()
    this.attemptSync(workoutId, 0) // Reset retry count for manual retry
  }

  /**
   * Get current sync queue status
   */
  getQueueStatus = () => ({
    pendingCount: this.pendingQueue.length,
    isCurrentlySyncing: this.isCurrentlySyncing,
    hasRetryScheduled: this.retryTimeouts.size > 0
  })

  /**
   * Clear all pending syncs and retry timeouts
   */
  clearQueue = (): void => {
    this.pendingQueue = []
    this.clearRetryTimeouts()
    this.isCurrentlySyncing = false
    console.log('Sync queue cleared')
  }

  /**
   * Clean up resources
   */
  destroy = (): void => {
    this.clearRetryTimeouts()
    
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
    }
  }

  /**
   * Handle page visibility changes (user switching tabs/apps)
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden' && this.pendingQueue.length > 0) {
      console.log('Page hidden with pending sets - attempting sync')
      // We don't have workoutId here, so this would need to be handled by the consuming component
      // For now, just log. The main sync triggers should handle most cases.
    }
  }

  /**
   * Handle page unload (user closing tab/navigating away)
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.pendingQueue.length > 0) {
      event.preventDefault()
      event.returnValue = 'You have unsaved workout data. Are you sure you want to leave?'
    }
  }

  /**
   * Clear all retry timeouts
   */
  private clearRetryTimeouts = (): void => {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
  }
}

/**
 * Hook that provides a configured sync service instance
 */
export function useWorkoutSyncService(
  workoutId: string,
  callbacks: SyncCallbacks,
  options?: SyncOptions
) {
  const [syncService] = useState(() => new WorkoutSyncService(callbacks, options))

  // Update callbacks when they change using a ref to avoid mutation
  const callbacksRef = useCallback(() => callbacks, [callbacks])
  
  useEffect(() => {
    // Update callbacks using the proper method
    const currentCallbacks = callbacksRef()
    syncService.updateCallbacks(currentCallbacks)
  }, [syncService, callbacksRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => syncService.destroy()
  }, [syncService])

  // Enhanced callbacks that include workoutId
  const addSets = useCallback((sets: LoggedSet[], allCurrentSets: LoggedSet[]) => syncService.addSets(sets, workoutId, allCurrentSets), [syncService, workoutId])
  const syncNow = useCallback(() => syncService.syncNow(workoutId), [syncService, workoutId])
  const syncCurrentState = useCallback((currentSets: LoggedSet[]) => syncService.syncCurrentState(workoutId, currentSets), [syncService, workoutId])
  const syncRemaining = useCallback(() => syncService.syncRemaining(workoutId), [syncService, workoutId])
  const retrySync = useCallback(() => syncService.retrySync(workoutId), [syncService, workoutId])

  return {
    addSets,
    syncNow,
    syncCurrentState,
    syncRemaining,
    retrySync,
    getQueueStatus: syncService.getQueueStatus,
    clearQueue: syncService.clearQueue,
    destroy: syncService.destroy
  }
}