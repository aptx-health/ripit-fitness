'use client'

import { useCallback, useEffect, useState } from 'react'

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline'

export type SyncState = {
  status: SyncStatus
  pendingSets: number
  totalSets: number
  lastSync: Date | null
  lastError: string | null
  retryCount: number
  isRetrying: boolean
}

/**
 * Custom hook for managing workout sync state and network status
 */
export function useSyncState() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    pendingSets: 0,
    totalSets: 0,
    lastSync: null,
    lastError: null,
    retryCount: 0,
    isRetrying: false
  })

  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine
    }
    return true // SSR default
  })

  // Network status detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      console.log('Network: Back online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('Network: Gone offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Determine current sync status based on network and sync state
  const currentStatus: SyncStatus = isOnline 
    ? (syncState.isRetrying || syncState.status === 'syncing' ? 'syncing' : 
       (syncState.status === 'error' ? 'error' : 'synced'))
    : 'offline'

  // Update sync state
  const updateSyncState = useCallback((updates: Partial<SyncState>) => {
    setSyncState(prev => ({ ...prev, ...updates }))
  }, [])

  // Mark sync as started
  const startSync = useCallback((pendingCount: number) => {
    updateSyncState({
      status: 'syncing',
      isRetrying: false,
      pendingSets: pendingCount
    })
  }, [updateSyncState])

  // Mark sync as successful
  const syncSuccess = useCallback((syncedCount: number) => {
    updateSyncState({
      status: 'synced',
      pendingSets: Math.max(0, syncState.pendingSets - syncedCount),
      totalSets: syncState.totalSets + syncedCount,
      lastSync: new Date(),
      lastError: null,
      retryCount: 0,
      isRetrying: false
    })
    console.log(`Sync success: ${syncedCount} sets synced`)
  }, [updateSyncState, syncState.pendingSets, syncState.totalSets])

  // Mark sync as failed
  const syncError = useCallback((error: string, willRetry: boolean = false) => {
    const newRetryCount = willRetry ? syncState.retryCount + 1 : syncState.retryCount
    
    updateSyncState({
      status: 'error',
      lastError: error,
      retryCount: newRetryCount,
      isRetrying: willRetry
    })
    
    console.error(`Sync error (attempt ${newRetryCount}):`, error)
  }, [updateSyncState, syncState.retryCount])

  // Start a retry attempt
  const startRetry = useCallback(() => {
    updateSyncState({
      status: 'syncing',
      isRetrying: true,
      lastError: null
    })
    console.log(`Starting retry attempt ${syncState.retryCount + 1}`)
  }, [updateSyncState, syncState.retryCount])

  // Reset retry count (used when manual retry succeeds or on new sync cycle)
  const resetRetries = useCallback(() => {
    updateSyncState({
      retryCount: 0,
      isRetrying: false,
      lastError: null
    })
  }, [updateSyncState])

  // Add new sets to pending count
  const addPendingSets = useCallback((count: number) => {
    updateSyncState({
      pendingSets: syncState.pendingSets + count
    })
  }, [updateSyncState, syncState.pendingSets])

  // Format error message for display
  const getDisplayError = useCallback(() => {
    if (!syncState.lastError) return null

    const errorMap: Record<string, string> = {
      'NetworkError': 'No internet connection',
      'fetch failed': 'Network error - check connection',
      'Timeout': 'Server took too long to respond',
      'TypeError: Failed to fetch': 'Connection failed',
      '401': 'Session expired - please refresh',
      '403': 'Permission denied',
      '404': 'Workout not found',
      '422': 'Invalid data - please check entries',
      '500': 'Server error - will retry automatically',
      'QuotaExceeded': 'Storage limit reached',
      'AbortError': 'Request was cancelled'
    }

    // Check for known error patterns
    for (const [key, message] of Object.entries(errorMap)) {
      if (syncState.lastError.includes(key)) {
        return message
      }
    }

    // If it's an HTTP status code
    const statusMatch = syncState.lastError.match(/(\d{3})/)
    if (statusMatch) {
      const status = statusMatch[1]
      return errorMap[status] || `Server error (${status})`
    }

    // Generic fallback
    return syncState.lastError.length > 50 
      ? `${syncState.lastError.substring(0, 50)}...`
      : syncState.lastError
  }, [syncState.lastError])

  // Get human-readable time since last sync
  const getTimeSinceLastSync = useCallback(() => {
    if (!syncState.lastSync) return null

    const now = new Date()
    const diff = now.getTime() - syncState.lastSync.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}m ago`
    } else if (seconds > 30) {
      return `${seconds}s ago`
    } else {
      return 'just now'
    }
  }, [syncState.lastSync])

  return {
    // State
    syncState: {
      ...syncState,
      status: currentStatus
    },
    isOnline,
    
    // Actions
    startSync,
    syncSuccess,
    syncError,
    startRetry,
    resetRetries,
    addPendingSets,
    updateSyncState,
    
    // Helpers
    getDisplayError,
    getTimeSinceLastSync
  }
}