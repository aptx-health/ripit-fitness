'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkoutStorage } from '@/hooks/useWorkoutStorage'
import { useSyncState } from '@/hooks/useSyncState'
import { useWorkoutSyncService } from '@/lib/sync/workoutSync'
import SyncStatusIcon from './SyncStatusIcon'
import SyncDetailsModal from './SyncDetailsModal'
import { LoadingFrog } from '@/components/ui/loading-frog'

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string // Changed from number to support ranges like "8-12"
  weight: string | null
  rpe: number | null
  rir: number | null
}

type Exercise = {
  id: string
  name: string
  order: number
  exerciseGroup: string | null
  notes: string | null
  prescribedSets: PrescribedSet[]
}

// Import LoggedSet type from the hook to ensure consistency
import { type LoggedSet } from '@/hooks/useWorkoutStorage'

type ExerciseHistorySet = {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

type ExerciseHistory = {
  completedAt: Date
  workoutName: string
  sets: ExerciseHistorySet[]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  exercises: Exercise[]
  workoutId: string
  workoutName: string
  onComplete: (loggedSets: LoggedSet[]) => Promise<void>
  exerciseHistory?: Record<string, ExerciseHistory | null> // NEW: Exercise history map
}

// Capitalized Function name because it's a React Component
export default function ExerciseLoggingModal({
  isOpen,
  onClose,
  exercises,
  workoutId,
  onComplete,
  exerciseHistory,
}: Props) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState({
    reps: '',
    weight: '',
    weightUnit: 'lbs',
    rpe: '',
    rir: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showSyncDetails, setShowSyncDetails] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean
    exerciseId?: string
    setNumber?: number
    isDeleteAll?: boolean
  }>({ show: false })

  // Enhanced persistence with localStorage backing
  const { loggedSets, setLoggedSets, isLoaded, clearStoredWorkout } = useWorkoutStorage(workoutId)
  
  // Sync state management
  const {
    syncState,
    startSync,
    syncSuccess,
    syncError,
    startRetry,
    addPendingSets,
    getDisplayError,
    getTimeSinceLastSync
  } = useSyncState()

  // Background sync service
  const { addSets, syncRemaining, retrySync, syncCurrentState } = useWorkoutSyncService(
    workoutId,
    {
      onSyncStart: (pendingCount) => {
        startSync(pendingCount)
        setHasUnsavedChanges(true)
      },
      onSyncSuccess: (syncedCount) => {
        syncSuccess(syncedCount)
        setHasUnsavedChanges(false)
        // If this was a deletion-only sync (0 sets), localStorage should reflect the deletions
        console.log('Sync successful - localStorage and server now in sync')
      },
      onSyncError: (error, willRetry) => {
        syncError(error, willRetry)
        setHasUnsavedChanges(true)
      },
      onRetryStart: startRetry,
    },
    {
      syncThreshold: 3, // Sync every 3 sets
      maxRetries: 3,
      baseDelay: 2000
    }
  )

  const currentExercise = exercises[currentExerciseIndex]
  const currentPrescribedSets = currentExercise.prescribedSets
  const currentExerciseLoggedSets = loggedSets.filter(
    (s) => s.exerciseId === currentExercise.id
  )
  const nextSetNumber = currentExerciseLoggedSets.length + 1
  const prescribedSet = currentPrescribedSets.find(
    (s) => s.setNumber === nextSetNumber
  )

  // Check if current exercise has any prescribed RPE/RIR
  const hasRpe = currentPrescribedSets.some((s) => s.rpe !== null)
  const hasRir = currentPrescribedSets.some((s) => s.rir !== null)

  // Check if this exercise is part of a superset
  const isSuperset = currentExercise.exerciseGroup !== null
  const supersetLabel = currentExercise.exerciseGroup

  const handleLogSet = useCallback(() => {
    if (!currentSet.reps || !currentSet.weight) return

    const newLoggedSet: LoggedSet = {
      exerciseId: currentExercise.id,
      setNumber: nextSetNumber,
      reps: parseInt(currentSet.reps, 10),
      weight: parseFloat(currentSet.weight),
      weightUnit: currentSet.weightUnit,
      rpe: currentSet.rpe ? parseInt(currentSet.rpe, 10) : null,
      rir: currentSet.rir ? parseInt(currentSet.rir, 10) : null,
    }

    // Update local state (automatically saves to localStorage)
    setLoggedSets(prev => {
      const updatedSets = [...prev, newLoggedSet]

      console.log('About to add set to sync queue:', newLoggedSet)

      // Add to sync queue for background syncing, passing ALL accumulated sets
      addSets([newLoggedSet], updatedSets)
      addPendingSets(1)
      setHasUnsavedChanges(true)

      console.log('Added set to sync queue and updated pending count')

      return updatedSets
    })
    
    // Reset form
    setCurrentSet({
      reps: '',
      weight: '',
      weightUnit: currentSet.weightUnit,
      rpe: '',
      rir: '',
    })
  }, [currentSet, currentExercise.id, nextSetNumber, setLoggedSets, addSets, addPendingSets])

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setCurrentSet({
        reps: '',
        weight: '',
        weightUnit: 'lbs',
        rpe: '',
        rir: '',
      })
    }
  }

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1)
      setCurrentSet({
        reps: '',
        weight: '',
        weightUnit: 'lbs',
        rpe: '',
        rir: '',
      })
    }
  }

  const handleCompleteWorkout = async () => {
    setIsSubmitting(true)
    try {
      // Sync any remaining sets before completing
      await syncRemaining()
      
      // Complete the workout through the original API
      await onComplete(loggedSets)
      
      // Clear localStorage after successful completion
      clearStoredWorkout()
      
      onClose()
    } catch (error) {
      console.error('Error completing workout:', error)
      alert('Failed to save workout. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSet = useCallback((setNumber: number) => {
    const exerciseId = currentExercise.id
    const exerciseSets = loggedSets.filter(s => s.exerciseId === exerciseId)
    
    // Show confirmation for dangerous operations
    if (exerciseSets.length === 1) {
      // Deleting the last set for this exercise
      setShowDeleteConfirm({
        show: true,
        exerciseId,
        setNumber,
        isDeleteAll: false
      })
      return
    }

    // Direct deletion for safe operations
    performDeleteSet(exerciseId, setNumber)
  }, [currentExercise.id, loggedSets])

  const performDeleteSet = useCallback((exerciseId: string, setNumber: number) => {
    console.log(`🗑️ Deleting set ${setNumber} for exercise ${exerciseId}`)
    
    const beforeCount = loggedSets.length
    setLoggedSets(prev =>
      prev.filter(
        (s) => !(s.exerciseId === exerciseId && s.setNumber === setNumber)
      )
    )
    
    // Enhanced logging for safety
    const afterCount = loggedSets.length - 1 // Will be one less after filter
    console.log(`📊 Deletion impact: ${beforeCount} → ${afterCount} total sets`)
    
    // Mark that we have unsaved changes (deletions)
    setHasUnsavedChanges(true)
    
    console.log('Set deleted locally - will sync with next batch or manual sync')
  }, [loggedSets, setLoggedSets])

  const handleConfirmDelete = useCallback(() => {
    if (showDeleteConfirm.exerciseId && showDeleteConfirm.setNumber) {
      performDeleteSet(showDeleteConfirm.exerciseId, showDeleteConfirm.setNumber)
    }
    setShowDeleteConfirm({ show: false })
  }, [showDeleteConfirm, performDeleteSet])

  // Manual sync function that passes current logged sets
  const handleManualSync = useCallback(() => {
    console.log('=== MANUAL SYNC TRIGGERED ===')
    console.log('Current logged sets:', loggedSets.length)
    console.log('Sets by exercise:', loggedSets.reduce((acc, set) => {
      acc[set.exerciseId] = (acc[set.exerciseId] || 0) + 1
      return acc
    }, {} as Record<string, number>))
    console.log('This will REPLACE all server data with current local state')
    console.log('Any deleted sets will be removed from server')
    
    syncCurrentState(loggedSets)
  }, [syncCurrentState, loggedSets])

  // Protect against accidental navigation away with unsaved changes
  useEffect(() => {
    if (!isOpen || loggedSets.length === 0) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncState.pendingSets > 0) {
        e.preventDefault()
        e.returnValue = 'You have unsaved workout data. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isOpen, loggedSets.length, syncState.pendingSets])

  // Don't render until storage is loaded to prevent flash of empty state
  if (!isLoaded) {
    return isOpen ? (
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center">
        <div className="bg-card rounded-lg p-8">
          <div className="animate-pulse text-center">Loading workout...</div>
        </div>
      </div>
    ) : null
  }

  const canLogSet = currentSet.reps && currentSet.weight
  const hasLoggedAllPrescribed =
    currentExerciseLoggedSets.length >= currentPrescribedSets.length
  const totalLoggedSets = loggedSets.length
  const totalPrescribedSets = exercises.reduce(
    (sum, ex) => sum + ex.prescribedSets.length,
    0
  )

  // Early returns after all hooks
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-end sm:items-center justify-center">
      {/* Sync Status Icon */}
      <SyncStatusIcon
        status={syncState.status}
        pendingCount={syncState.pendingSets}
        onClick={() => setShowSyncDetails(true)}
      />

      {/* Sync Details Modal */}
      <SyncDetailsModal
        isOpen={showSyncDetails}
        onClose={() => setShowSyncDetails(false)}
        syncState={syncState}
        onRetrySync={retrySync}
        onSyncNow={handleManualSync}
        hasUnsavedChanges={hasUnsavedChanges}
        getDisplayError={getDisplayError}
        getTimeSinceLastSync={getTimeSinceLastSync}
      />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="bg-card w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-2xl flex flex-col">
        {/* Header */}
        <div className="bg-primary text-white px-4 py-3 sm:rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-primary-foreground opacity-80">
              Exercise {currentExerciseIndex + 1} of {exercises.length} • {totalLoggedSets}/
              {totalPrescribedSets} sets logged
            </div>
            <button
              onClick={onClose}
              className="text-white hover:opacity-80 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Exercise Navigation - Title and L/R Buttons */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted flex-shrink-0">
          <button
            onClick={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              {isSuperset && (
                <span className="px-2 py-1 bg-accent-muted text-accent-text text-xs font-bold rounded">
                  Superset {supersetLabel}
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{currentExercise.name}</h3>
            </div>
            {currentExercise.notes && (
              <p className="text-sm text-muted-foreground mt-1">{currentExercise.notes}</p>
            )}
          </div>

          <button
            onClick={handleNextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Last Performance (if available) */}
          {exerciseHistory && exerciseHistory[currentExercise.id] && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Last Time ({new Date(exerciseHistory[currentExercise.id]!.completedAt).toLocaleDateString()})
              </h4>
              <div className="bg-primary-muted rounded-lg p-3 space-y-1 border border-primary-muted-dark">
                {exerciseHistory[currentExercise.id]!.sets.map((set) => (
                  <div key={set.setNumber} className="text-sm text-primary">
                    Set {set.setNumber}: {set.reps} reps @ {set.weight}{set.weightUnit}
                    {set.rir !== null && ` • RIR ${set.rir}`}
                    {set.rpe !== null && ` • RPE ${set.rpe}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescribed Sets Reference */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Today&apos;s Target</h4>
            <div className="bg-muted rounded-lg p-3 space-y-1">
              {currentPrescribedSets.map((set) => (
                <div key={set.id} className="text-sm text-foreground">
                  Set {set.setNumber}: {set.reps} reps @ {set.weight || '—'}
                  {set.rir !== null && ` • RIR ${set.rir}`}
                  {set.rpe !== null && ` • RPE ${set.rpe}`}
                </div>
              ))}
            </div>
          </div>

          {/* Logged Sets */}
          {currentExerciseLoggedSets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Logged Sets</h4>
              <div className="space-y-2">
                {currentExerciseLoggedSets.map((set) => (
                  <div
                    key={`${set.exerciseId}-${set.setNumber}`}
                    className="bg-success-muted border border-success-border rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <span className="font-semibold text-foreground font-semibold">Set {set.setNumber}:</span>{' '}
                      <span className="text-success-text">
                        {set.reps} reps @ {set.weight}
                        {set.weightUnit}
                        {set.rir !== null && ` • RIR ${set.rir}`}
                        {set.rpe !== null && ` • RPE ${set.rpe}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSet(set.setNumber)}
                      className="text-error hover:text-error-hover p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Next Set */}
          {!hasLoggedAllPrescribed && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Log Set {nextSetNumber}
                {prescribedSet && (
                  <span className="text-muted-foreground font-normal ml-2">
                    (Target: {prescribedSet.reps} reps @ {prescribedSet.weight || '—'})
                  </span>
                )}
              </h4>

              <div className="space-y-3">
                {/* Reps and Weight - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Reps *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={currentSet.reps}
                      onChange={(e) =>
                        setCurrentSet({ ...currentSet, reps: e.target.value })
                      }
                      placeholder={prescribedSet?.reps.toString() || '0'}
                      className="w-full px-4 py-3 text-lg border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-muted text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Weight * ({currentSet.weightUnit})
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={currentSet.weight}
                      onChange={(e) =>
                        setCurrentSet({ ...currentSet, weight: e.target.value })
                      }
                      placeholder={prescribedSet?.weight?.replace(/[^0-9.]/g, '') || '0'}
                      className="w-full px-4 py-3 text-lg border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-muted text-foreground"
                    />
                  </div>
                </div>

                {/* Weight Unit Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentSet({ ...currentSet, weightUnit: 'lbs' })}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      currentSet.weightUnit === 'lbs'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground hover:bg-secondary-hover'
                    }`}
                  >
                    lbs
                  </button>
                  <button
                    onClick={() => setCurrentSet({ ...currentSet, weightUnit: 'kg' })}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      currentSet.weightUnit === 'kg'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground hover:bg-secondary-hover'
                    }`}
                  >
                    kg
                  </button>
                </div>

                {/* Optional RPE/RIR */}
                {(hasRpe || hasRir) && (
                  <div className="grid grid-cols-2 gap-3">
                    {hasRir && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          RIR (optional)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="10"
                          value={currentSet.rir}
                          onChange={(e) =>
                            setCurrentSet({ ...currentSet, rir: e.target.value })
                          }
                          placeholder={prescribedSet?.rir?.toString() || '—'}
                          className="w-full px-4 py-3 text-lg border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-muted text-foreground"
                        />
                      </div>
                    )}

                    {hasRpe && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          RPE (optional)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="10"
                          value={currentSet.rpe}
                          onChange={(e) =>
                            setCurrentSet({ ...currentSet, rpe: e.target.value })
                          }
                          placeholder={prescribedSet?.rpe?.toString() || '—'}
                          className="w-full px-4 py-3 text-lg border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-muted text-foreground"
                        />
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Exercise Complete Message */}
          {hasLoggedAllPrescribed && (
            <div className="bg-success-muted border border-success-border rounded-lg p-4 text-center">
              <div className="text-success-text font-semibold mb-2">
                ✓ All prescribed sets logged!
              </div>
              <p className="text-sm text-success-text">
                {currentExerciseIndex < exercises.length - 1
                  ? 'Continue to next exercise or complete workout'
                  : 'All exercises complete! Ready to finish workout.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-border px-4 py-3 bg-muted flex-shrink-0 space-y-2">
          {/* Log Set Button - Full width */}
          {!hasLoggedAllPrescribed && (
            <button
              onClick={handleLogSet}
              disabled={!canLogSet}
              className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Log Set {nextSetNumber}
            </button>
          )}

          {/* Navigation buttons - Side by side */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNextExercise}
              disabled={currentExerciseIndex === exercises.length - 1}
              className="py-2.5 bg-accent text-accent-foreground rounded-lg font-semibold hover:bg-accent-hover active:bg-accent-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next Exercise →
            </button>

            <button
              onClick={handleCompleteWorkout}
              disabled={isSubmitting || totalLoggedSets === 0}
              className="py-2.5 bg-success text-success-foreground rounded-lg font-semibold hover:bg-success-hover active:bg-success-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onMouseDown={(e) => {
                if (isSubmitting || totalLoggedSets === 0) return;
                e.preventDefault();
                setIsConfirming(true);
              }}
            >
              {isSubmitting ? 'Saving...' : `Complete (${totalLoggedSets})`}
            </button>
 
            {/* Workout completion confirmation modal */}
            {isConfirming && (
              <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
                <div className="bg-card p-6 rounded-lg text-center min-w-[300px]">
                  {!isSubmitting ? (
                    <>
                      <p className="text-lg mb-4 text-foreground">Complete this workout?</p>
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={() => setIsConfirming(false)}
                          className="px-4 py-2 bg-muted text-foreground rounded hover:bg-secondary-hover"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCompleteWorkout}
                          className="px-4 py-2 bg-success text-white rounded hover:bg-success-hover"
                        >
                          Confirm
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex justify-center">
                        <LoadingFrog size={64} speed={0.8} />
                      </div>
                      <p className="text-foreground">Completing workout...</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Deletion confirmation modal */}
            {showDeleteConfirm.show && (
              <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
                <div className="bg-card p-6 rounded-lg text-center max-w-sm">
                  <div className="text-warning mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Delete Last Set?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will remove the only remaining set for this exercise. Are you sure?
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm({ show: false })}
                      className="px-4 py-2 bg-muted text-foreground rounded hover:bg-secondary-hover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 bg-error text-white rounded hover:bg-error-hover"
                    >
                      Delete Set
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
