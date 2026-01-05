import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorkoutSyncService } from '@/lib/sync/workoutSync'
import type { SyncCallbacks } from '@/lib/sync/workoutSync'
import type { LoggedSet } from '@/hooks/useWorkoutStorage'

// Mock fetch for testing API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WorkoutSyncService', () => {
  let syncService: WorkoutSyncService
  let callbacks: SyncCallbacks
  const testWorkoutId = 'test-workout-123'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset callbacks with spies
    callbacks = {
      onSyncStart: vi.fn(),
      onSyncSuccess: vi.fn(),
      onSyncError: vi.fn(),
      onRetryStart: vi.fn(),
    }
    
    syncService = new WorkoutSyncService(callbacks, {
      maxRetries: 2,
      baseDelay: 100, // Shorter delay for tests
      syncThreshold: 3
    })
  })

  afterEach(() => {
    syncService.destroy()
  })

  describe('Deletion Safety', () => {
    it('should warn when syncing empty sets array', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      
      const consoleSpy = vi.spyOn(console, 'warn')
      
      // Test syncing empty array (deletion operation)
      await syncService.syncCurrentState(testWorkoutId, [])
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Sending empty sets array - this will DELETE all server data')
      )
      
      expect(callbacks.onSyncStart).toHaveBeenCalledWith(0)
      expect(callbacks.onSyncSuccess).toHaveBeenCalledWith(0)
    })

    it('should validate input data before syncing', async () => {
      const invalidSets = [
        {
          // Missing required fields
          exerciseId: '',
          setNumber: 'invalid' as unknown as number,
          reps: 10,
          weight: 135,
          weightUnit: 'lbs',
          rpe: null,
          rir: null
        }
      ]
      
      await syncService.syncCurrentState(testWorkoutId, invalidSets)
      
      expect(callbacks.onSyncError).toHaveBeenCalledWith('Invalid set data structure', false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should reject invalid workoutId', async () => {
      const validSets: LoggedSet[] = [createValidLoggedSet()]
      
      await syncService.syncCurrentState('', validSets)
      
      expect(callbacks.onSyncError).toHaveBeenCalledWith('Invalid workout ID', false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should reject non-array currentSets', async () => {
      await syncService.syncCurrentState(testWorkoutId, 'invalid' as unknown as LoggedSet[])
      
      expect(callbacks.onSyncError).toHaveBeenCalledWith('Invalid sets data', false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Background Sync Logic', () => {
    it('should sync when threshold is reached', () => {
      const sets = [
        createValidLoggedSet(1),
        createValidLoggedSet(2),
        createValidLoggedSet(3)
      ]
      
      const consoleSpy = vi.spyOn(console, 'log')
      
      // Mock successful API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      
      // Add sets one by one - should trigger sync on 3rd set
      syncService.addSets([sets[0]], testWorkoutId, [sets[0]])
      expect(mockFetch).not.toHaveBeenCalled()

      syncService.addSets([sets[1]], testWorkoutId, [sets[0], sets[1]])
      expect(mockFetch).not.toHaveBeenCalled()

      syncService.addSets([sets[2]], testWorkoutId, [sets[0], sets[1], sets[2]])

      expect(consoleSpy).toHaveBeenCalledWith('Threshold reached, triggering sync with all', 3, 'sets')
    })

    it('should not sync before threshold', () => {
      const sets = [createValidLoggedSet(1), createValidLoggedSet(2)]

      syncService.addSets(sets, testWorkoutId, sets)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(syncService.getQueueStatus().pendingCount).toBe(2)
    })

    it('should handle multiple sets added at once', () => {
      const sets = [
        createValidLoggedSet(1),
        createValidLoggedSet(2),
        createValidLoggedSet(3),
        createValidLoggedSet(4)
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      // Add 4 sets at once - should trigger sync immediately (> threshold)
      syncService.addSets(sets, testWorkoutId, sets)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed sync with exponential backoff', async () => {
      const sets = [createValidLoggedSet()]
      
      // Mock failed then successful API calls
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
      
      await syncService.syncCurrentState(testWorkoutId, sets)
      
      expect(callbacks.onSyncError).toHaveBeenCalledWith('Network error', true)
      
      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(callbacks.onRetryStart).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should stop retrying after max attempts', async () => {
      const sets = [createValidLoggedSet()]
      
      // Mock all calls to fail
      mockFetch.mockRejectedValue(new Error('Persistent error'))
      
      await syncService.syncCurrentState(testWorkoutId, sets)
      
      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(callbacks.onSyncError).toHaveBeenCalledTimes(3) // Initial + 2 retries
      expect(callbacks.onSyncError).toHaveBeenLastCalledWith('Persistent error', false)
    })

    it('should handle 4xx errors without retry', async () => {
      const sets = [createValidLoggedSet()]
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid request' })
      })
      
      await syncService.syncCurrentState(testWorkoutId, sets)
      
      expect(callbacks.onSyncError).toHaveBeenCalledWith('Invalid request', true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Queue Management', () => {
    it('should track pending sets correctly', () => {
      const sets1 = [createValidLoggedSet(1)]
      const sets2 = [createValidLoggedSet(2)]

      syncService.addSets(sets1, testWorkoutId, sets1)
      expect(syncService.getQueueStatus().pendingCount).toBe(1)

      syncService.addSets(sets2, testWorkoutId, [...sets1, ...sets2])
      expect(syncService.getQueueStatus().pendingCount).toBe(2)
    })

    it('should clear queue after successful sync', async () => {
      const sets = [
        createValidLoggedSet(1),
        createValidLoggedSet(2),
        createValidLoggedSet(3)
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      // Add sets to trigger sync
      syncService.addSets(sets, testWorkoutId, sets)

      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(syncService.getQueueStatus().pendingCount).toBe(0)
      expect(callbacks.onSyncSuccess).toHaveBeenCalledWith(3)
    })

    it('should allow manual queue clearing', () => {
      const sets = [createValidLoggedSet(1), createValidLoggedSet(2)]

      syncService.addSets(sets, testWorkoutId, sets)
      expect(syncService.getQueueStatus().pendingCount).toBe(2)

      syncService.clearQueue()
      expect(syncService.getQueueStatus().pendingCount).toBe(0)
    })
  })

  describe('Concurrent Sync Protection', () => {
    it('should prevent concurrent syncs', async () => {
      const sets = [createValidLoggedSet()]
      
      // Mock slow API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      )
      
      // Start two syncs simultaneously
      const sync1 = syncService.syncCurrentState(testWorkoutId, sets)
      const sync2 = syncService.syncCurrentState(testWorkoutId, sets)
      
      await Promise.all([sync1, sync2])
      
      // Only one API call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Manual Sync vs Queue Sync', () => {
    it('should sync current state regardless of queue', async () => {
      // Add some sets to queue but don't trigger auto-sync
      const queuedSets = [createValidLoggedSet(1)]
      syncService.addSets(queuedSets, testWorkoutId, queuedSets)

      // Different current state to sync manually
      const currentSets = [
        createValidLoggedSet(2),
        createValidLoggedSet(3),
        createValidLoggedSet(4)
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      
      await syncService.syncCurrentState(testWorkoutId, currentSets)
      
      // Should sync current sets, not queued sets
      const apiCall = mockFetch.mock.calls[0]
      const body = JSON.parse(apiCall[1].body)
      expect(body.loggedSets).toHaveLength(3)
      expect(body.loggedSets[0].setNumber).toBe(2)
      
      // Queue should still have pending sets (manual sync doesn't clear queue)
      expect(syncService.getQueueStatus().pendingCount).toBe(1)
    })
  })
})

// Helper function to create valid logged set data
function createValidLoggedSet(setNumber: number = 1): LoggedSet {
  return {
    exerciseId: 'test-exercise-123',
    setNumber,
    reps: 10,
    weight: 135,
    weightUnit: 'lbs',
    rpe: 8,
    rir: 2
  }
}