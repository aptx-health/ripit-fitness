import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkoutStorage, LoggedSet } from '@/hooks/useWorkoutStorage'

// Mock localStorage
const localStorageMock = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => localStorageMock.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store.set(key, value)
  }),
  removeItem: vi.fn((key: string) => {
    localStorageMock.store.delete(key)
  }),
  clear: vi.fn(() => {
    localStorageMock.store.clear()
  }),
  key: vi.fn((index: number) => {
    const keys = Array.from(localStorageMock.store.keys())
    return keys[index] || null
  }),
  get length() {
    return localStorageMock.store.size
  }
}

// Mock window and localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('useWorkoutStorage', () => {
  const testWorkoutId = 'workout-123'
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.store.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    consoleSpy.mockClear()
  })

  describe('Data Loading', () => {
    it('should load empty array initially when no stored data', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      expect(result.current.loggedSets).toEqual([])
      expect(result.current.isLoaded).toBe(true)
    })

    it('should load stored sets from localStorage', () => {
      const storedSets: LoggedSet[] = [
        createValidLoggedSet(1),
        createValidLoggedSet(2)
      ]
      
      const storedData = {
        loggedSets: storedSets,
        timestamp: Date.now(),
        workoutId: testWorkoutId,
        lastModified: Date.now()
      }
      
      localStorageMock.store.set(`workout-${testWorkoutId}`, JSON.stringify(storedData))
      
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      expect(result.current.isLoaded).toBe(true)
      expect(result.current.loggedSets).toEqual(storedSets)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Loaded 2 sets from localStorage for workout ${testWorkoutId}`)
      )
    })

    it('should ignore expired data and remove it', () => {
      const expiredData = {
        loggedSets: [createValidLoggedSet(1)],
        timestamp: Date.now() - (15 * 24 * 60 * 60 * 1000), // 15 days ago (expired)
        workoutId: testWorkoutId,
        lastModified: Date.now()
      }
      
      localStorageMock.store.set(`workout-${testWorkoutId}`, JSON.stringify(expiredData))
      
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      expect(result.current.isLoaded).toBe(true)
      expect(result.current.loggedSets).toEqual([])
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`workout-${testWorkoutId}`)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Cleaned up 1 expired workout(s) from localStorage`)
      )
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.store.set(`workout-${testWorkoutId}`, 'invalid-json')
      
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      expect(result.current.isLoaded).toBe(true)
      expect(result.current.loggedSets).toEqual([])
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`workout-${testWorkoutId}`)
    })
  })

  describe('Data Saving', () => {
    it('should save sets to localStorage when modified', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      const newSets: LoggedSet[] = [createValidLoggedSet(1)]
      
      act(() => {
        result.current.setLoggedSets(newSets)
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `workout-${testWorkoutId}`,
        expect.stringContaining('"loggedSets"')
      )
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`💾 Saved 1 sets to localStorage for workout ${testWorkoutId}`)
      )
    })

    it('should not save when no sets are present', () => {
      renderHook(() => useWorkoutStorage(testWorkoutId))
      
      // Sets start empty and remain empty
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should save with correct data structure', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      const testSets: LoggedSet[] = [
        createValidLoggedSet(1),
        createValidLoggedSet(2)
      ]
      
      act(() => {
        result.current.setLoggedSets(testSets)
      })
      
      const saveCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === `workout-${testWorkoutId}`
      )
      
      expect(saveCall).toBeDefined()
      
      const savedData = JSON.parse(saveCall![1])
      expect(savedData).toMatchObject({
        loggedSets: testSets,
        workoutId: testWorkoutId,
        timestamp: expect.any(Number),
        lastModified: expect.any(Number)
      })
    })

    it('should handle localStorage quota exceeded gracefully', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const testSets: LoggedSet[] = [createValidLoggedSet(1)]
      
      act(() => {
        result.current.setLoggedSets(testSets)
      })
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error saving workout to localStorage:'),
        expect.any(Error)
      )
      
      errorSpy.mockRestore()
    })
  })

  describe('Cleanup Operations', () => {
    it('should clean up expired workouts on initialization', () => {
      // Add some expired and fresh workouts to localStorage
      const expiredWorkout = {
        loggedSets: [createValidLoggedSet(1)],
        timestamp: Date.now() - (20 * 24 * 60 * 60 * 1000), // 20 days ago
        workoutId: 'expired-workout',
        lastModified: Date.now()
      }
      
      const freshWorkout = {
        loggedSets: [createValidLoggedSet(1)],
        timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
        workoutId: 'fresh-workout',
        lastModified: Date.now()
      }
      
      localStorageMock.store.set('workout-expired', JSON.stringify(expiredWorkout))
      localStorageMock.store.set('workout-fresh', JSON.stringify(freshWorkout))
      localStorageMock.store.set('non-workout-key', 'some-data')
      
      renderHook(() => useWorkoutStorage(testWorkoutId))
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('workout-expired')
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('workout-fresh')
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('non-workout-key')
    })

    it('should clear specific workout storage', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      // First add some data
      act(() => {
        result.current.setLoggedSets([createValidLoggedSet(1)])
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      // Then clear it
      act(() => {
        result.current.clearStoredWorkout()
      })
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`workout-${testWorkoutId}`)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Cleared stored data for workout ${testWorkoutId}`)
      )
    })
  })

  describe('Storage Info', () => {
    it('should return null when no data stored', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      const info = result.current.getStorageInfo()
      expect(info).toBeNull()
    })

    it('should return storage information when data exists', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      const testSets: LoggedSet[] = [createValidLoggedSet(1), createValidLoggedSet(2)]
      
      act(() => {
        result.current.setLoggedSets(testSets)
      })
      
      const info = result.current.getStorageInfo()
      
      expect(info).toMatchObject({
        setsCount: 2,
        lastModified: expect.any(Date),
        age: expect.any(Number),
        sizeBytes: expect.any(Number)
      })
    })

    it('should handle corrupted storage data in getStorageInfo', () => {
      localStorageMock.store.set(`workout-${testWorkoutId}`, 'corrupted-data')
      
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      const info = result.current.getStorageInfo()
      expect(info).toBeNull()
    })
  })

  describe('Function Updates', () => {
    it('should support functional updates', () => {
      const { result } = renderHook(() => useWorkoutStorage(testWorkoutId))
      
      // Add initial set
      act(() => {
        result.current.setLoggedSets([createValidLoggedSet(1)])
      })
      
      // Add another set using functional update
      act(() => {
        result.current.setLoggedSets(prev => [...prev, createValidLoggedSet(2)])
      })
      
      expect(result.current.loggedSets).toHaveLength(2)
      expect(result.current.loggedSets[1].setNumber).toBe(2)
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