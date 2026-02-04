'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useWorkoutStorage } from '@/hooks/useWorkoutStorage'
import { useSyncState } from '@/hooks/useSyncState'
import { useWorkoutSyncService } from '@/lib/sync/workoutSync'
import SyncDetailsModal from './SyncDetailsModal'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { AlertTriangle } from 'lucide-react'
import { AddExerciseWizard } from './workout-logging/wizards/AddExerciseWizard'
import { SwapExerciseWizard } from './workout-logging/wizards/SwapExerciseWizard'
import { EditExerciseWizard } from './workout-logging/wizards/EditExerciseWizard'
import { DeleteExerciseWizard } from './workout-logging/wizards/DeleteExerciseWizard'
import ExerciseLoggingHeader from './workout-logging/ExerciseLoggingHeader'
import ExerciseNavigation from './workout-logging/ExerciseNavigation'
import ExerciseDisplayTabs from './workout-logging/ExerciseDisplayTabs'
import SetLoggingForm from './workout-logging/SetLoggingForm'
import ExerciseActionsFooter from './workout-logging/ExerciseActionsFooter'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/radix/dialog'

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
  isOneOff?: boolean // For one-off exercises added during logging
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
  workoutCompletionId?: string // Completion ID for one-off exercises
  onComplete: (loggedSets: LoggedSet[]) => Promise<void>
  onRefresh?: () => void // Callback to refresh exercise data after add/swap
  exerciseHistory?: Record<string, ExerciseHistory | null> // NEW: Exercise history map
}

// Capitalized Function name because it's a React Component
export default function ExerciseLoggingModal({
  isOpen,
  onClose,
  exercises,
  workoutId,
  workoutCompletionId,
  onComplete,
  onRefresh,
  exerciseHistory,
}: Props) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState({
    reps: '',
    weight: '',
    weightUnit: 'lbs' as 'lbs' | 'kg',
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
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Wizard state
  const [activeWizard, setActiveWizard] = useState<'add' | 'swap' | 'edit' | 'delete' | null>(null)
  const [navigateToLastExercise, setNavigateToLastExercise] = useState(false)

  // Enhanced persistence with localStorage backing
  const { loggedSets, setLoggedSets, isLoaded, clearStoredWorkout } = useWorkoutStorage(workoutId)

  // Validate and clean up localStorage on load to prevent cross-workout contamination
  useEffect(() => {
    if (!isLoaded || exercises.length === 0 || loggedSets.length === 0) return

    const validExerciseIds = new Set(exercises.map(e => e.id))
    const invalidSets = loggedSets.filter(set => !validExerciseIds.has(set.exerciseId))

    // Only update if we found invalid sets (prevents infinite loop)
    if (invalidSets.length > 0) {
      console.warn(`⚠️ Found ${invalidSets.length} sets with invalid exercise IDs in localStorage, cleaning up...`)
      console.log('Invalid exercise IDs:', [...new Set(invalidSets.map(s => s.exerciseId))])

      // Filter out invalid sets
      const validSets = loggedSets.filter(set => validExerciseIds.has(set.exerciseId))
      setLoggedSets(validSets)

      console.log(`✅ Cleaned localStorage: ${loggedSets.length} → ${validSets.length} sets`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, exercises.length, workoutId]) // Only run when workout changes or loads

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
  const currentPrescribedSets = currentExercise?.prescribedSets || []
  const currentExerciseLoggedSets = loggedSets.filter(
    (s) => s.exerciseId === currentExercise?.id
  )
  const nextSetNumber = currentExerciseLoggedSets.length + 1
  const prescribedSet = currentPrescribedSets.find(
    (s) => s.setNumber === nextSetNumber
  )

  // Check if current exercise has any prescribed RPE/RIR
  const hasRpe = currentPrescribedSets.some((s) => s.rpe !== null)
  const hasRir = currentPrescribedSets.some((s) => s.rir !== null)

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
  }, [currentSet, currentExercise?.id, nextSetNumber, setLoggedSets, addSets, addPendingSets])

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

  const handleReplaceExercise = () => {
    setActiveWizard('swap')
  }

  const handleAddExercise = () => {
    setActiveWizard('add')
  }

  const handleDeleteExercise = () => {
    setActiveWizard('delete')
  }

  const handleEditExercise = () => {
    setActiveWizard('edit')
  }

  const handleExitWorkout = () => {
    setShowExitConfirm(true)
  }

  const handleExitSaveAsDraft = () => {
    // Keep logged sets in localStorage (already handled by useWorkoutStorage)
    console.log('Saving workout as draft...')
    setShowExitConfirm(false)
    onClose()
  }

  const handleExitDiscard = () => {
    // Clear all logged sets from localStorage
    console.log('Discarding workout...')
    clearStoredWorkout()
    setShowExitConfirm(false)
    onClose()
  }

  const handleWizardComplete = async () => {
    // Trigger refresh
    if (onRefresh) {
      onRefresh()
    }

    // Wait for refresh to complete
    await new Promise(resolve => setTimeout(resolve, 2500))

    // If we added an exercise, navigate to it (it will be at the end)
    if (activeWizard === 'add') {
      setNavigateToLastExercise(true)
    }

    // Reset wizard state
    setActiveWizard(null)
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
  }, [currentExercise?.id, loggedSets])

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

  // Handle exercise deletion - adjust index if current exercise was deleted
  useEffect(() => {
    if (!isOpen || exercises.length === 0) {
      // No exercises left - close modal
      if (isOpen && exercises.length === 0) {
        onClose()
      }
      return
    }

    // Check if current exercise still exists
    const currentExerciseStillExists = exercises.some(ex => ex.id === currentExercise?.id)

    if (!currentExerciseStillExists) {
      // Current exercise was deleted - navigate to previous or next
      if (currentExerciseIndex > 0) {
        // Go to previous exercise
        setCurrentExerciseIndex(currentExerciseIndex - 1)
      } else if (exercises.length > 0) {
        // We were at index 0, stay at 0 (which is now a different exercise)
        setCurrentExerciseIndex(0)
      }
    } else if (currentExerciseIndex >= exercises.length) {
      // Index out of bounds - go to last exercise
      setCurrentExerciseIndex(exercises.length - 1)
    }
  }, [exercises, isOpen, currentExerciseIndex, currentExercise?.id, onClose])

  // Navigate to newly added exercise
  useEffect(() => {
    if (navigateToLastExercise && exercises.length > 0) {
      setCurrentExerciseIndex(exercises.length - 1)
      setNavigateToLastExercise(false)
    }
  }, [navigateToLastExercise, exercises.length])

  // Don't render until storage is loaded to prevent flash of empty state
  if (!isLoaded) {
    if (!isOpen) return null
    if (typeof document === 'undefined') return null
    return createPortal(
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center">
        <div className="bg-card border-2 border-border p-8 shadow-xl doom-corners">
          <div className="animate-pulse text-center uppercase tracking-wider font-bold">Loading workout...</div>
        </div>
      </div>,
      document.body
    )
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

  // Guard against invalid exercise index (can happen briefly after deletion)
  if (!currentExercise) {
    // If no exercises left, close modal
    if (exercises.length === 0) {
      onClose()
      return null
    }
    // Otherwise, show loading while useEffect adjusts the index
    if (typeof document === 'undefined') return null
    return createPortal(
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center">
        <div className="bg-card border-2 border-border p-8 shadow-xl doom-corners">
          <div className="animate-pulse text-center uppercase tracking-wider font-bold">Loading...</div>
        </div>
      </div>,
      document.body
    )
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center">
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
        <div className="bg-card w-full h-[100dvh] sm:h-[85vh] sm:max-h-[85vh] sm:max-w-2xl sm:border-2 sm:border-border sm:rounded-lg flex flex-col shadow-xl">
          {/* Header with Sync Status */}
          <ExerciseLoggingHeader
            currentExerciseIndex={currentExerciseIndex}
            totalExercises={exercises.length}
            totalLoggedSets={totalLoggedSets}
            totalPrescribedSets={totalPrescribedSets}
            syncStatus={syncState.status}
            pendingSetsCount={syncState.pendingSets}
            onSyncClick={() => setShowSyncDetails(true)}
          />

          {/* Exercise Navigation */}
          <ExerciseNavigation
            currentExercise={currentExercise}
            currentExerciseIndex={currentExerciseIndex}
            totalExercises={exercises.length}
            onPrevious={handlePreviousExercise}
            onNext={handleNextExercise}
          />

          {/* Content area with tabs - tabs handle their own scrolling */}
          <div className="flex-1 overflow-hidden pb-2">
            <ExerciseDisplayTabs
              exercise={currentExercise}
              prescribedSets={currentPrescribedSets}
              loggedSets={currentExerciseLoggedSets}
              exerciseHistory={exerciseHistory?.[currentExercise.id] || null}
              onDeleteSet={handleDeleteSet}
              loggingForm={
                <SetLoggingForm
                  prescribedSet={prescribedSet}
                  nextSetNumber={nextSetNumber}
                  hasLoggedAllPrescribed={hasLoggedAllPrescribed}
                  hasRpe={hasRpe}
                  hasRir={hasRir}
                  currentSet={currentSet}
                  onSetChange={setCurrentSet}
                />
              }
            />
          </div>

          {/* Actions Footer */}
          <ExerciseActionsFooter
            currentExerciseName={currentExercise.name}
            nextSetNumber={nextSetNumber}
            totalLoggedSets={totalLoggedSets}
            totalPrescribedSets={totalPrescribedSets}
            canLogSet={!!canLogSet}
            hasLoggedAllPrescribed={hasLoggedAllPrescribed}
            isSubmitting={isSubmitting}
            onLogSet={handleLogSet}
            onCompleteWorkout={() => setIsConfirming(true)}
            onAddExercise={handleAddExercise}
            onEditExercise={handleEditExercise}
            onReplaceExercise={handleReplaceExercise}
            onDeleteExercise={handleDeleteExercise}
            onExitWorkout={handleExitWorkout}
          />

          {/* Workout completion confirmation modal */}
          {isConfirming && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
              <div className="bg-card border-2 border-border p-6 sm:p-8 text-center min-w-[300px] shadow-xl doom-corners">
                {!isSubmitting ? (
                  <>
                    <p className="text-lg sm:text-xl mb-6 text-foreground font-bold uppercase tracking-wider">Complete this workout?</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setIsConfirming(false)}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 text-base bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCompleteWorkout}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 text-base bg-success text-white hover:bg-success/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
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
                    <p className="text-foreground uppercase tracking-wider font-bold">Completing workout...</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Deletion confirmation modal */}
          {showDeleteConfirm.show && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
              <div className="bg-card border-2 border-error p-6 sm:p-8 text-center max-w-sm shadow-xl doom-corners">
                <div className="text-warning mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 uppercase tracking-wider">Delete Last Set?</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  This will remove the only remaining set for this exercise. Are you sure?
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm({ show: false })}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-base bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-base bg-error text-white hover:bg-error/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
                  >
                    Delete Set
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Exercise Search Modal */}
      {/* Wizards */}
      {activeWizard === 'add' && (
        <AddExerciseWizard
          open={true}
          onOpenChange={(open) => !open && setActiveWizard(null)}
          workoutId={workoutId}
          workoutCompletionId={workoutCompletionId}
          onComplete={handleWizardComplete}
        />
      )}

      {activeWizard === 'swap' && currentExercise && (
        <SwapExerciseWizard
          open={true}
          onOpenChange={(open) => !open && setActiveWizard(null)}
          currentExerciseId={currentExercise.id}
          currentExerciseName={currentExercise.name}
          onComplete={handleWizardComplete}
        />
      )}

      {activeWizard === 'edit' && currentExercise && (
        <EditExerciseWizard
          open={true}
          onOpenChange={(open) => !open && setActiveWizard(null)}
          exercise={currentExercise}
          onComplete={handleWizardComplete}
        />
      )}

      {activeWizard === 'delete' && currentExercise && (
        <DeleteExerciseWizard
          open={true}
          onOpenChange={(open) => !open && setActiveWizard(null)}
          exerciseId={currentExercise.id}
          exerciseName={currentExercise.name}
          onComplete={handleWizardComplete}
        />
      )}

      {/* Exit workout confirmation dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border-2 border-warning p-6 sm:p-8 text-center max-w-sm w-full shadow-xl doom-corners">
            <div className="text-warning mb-4 flex justify-center">
              <AlertTriangle size={56} strokeWidth={2} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 uppercase tracking-wider">
              {totalLoggedSets > 0 ? 'Exit Workout?' : 'Confirm Exit'}
            </h3>
            <p className="text-base sm:text-lg text-muted-foreground mb-6">
              {totalLoggedSets > 0
                ? 'You have logged sets. Do you want to save as draft or discard?'
                : 'Are you sure you want to exit?'}
            </p>
            {totalLoggedSets > 0 ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleExitSaveAsDraft}
                  className="w-full px-4 py-3 text-base sm:text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
                >
                  Save as Draft
                </button>
                <button
                  onClick={handleExitDiscard}
                  className="w-full px-4 py-3 text-base sm:text-lg bg-error text-error-foreground hover:bg-error/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
                >
                  Discard All
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full px-4 py-3 text-base sm:text-lg bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-3 text-base sm:text-lg bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExitDiscard}
                  className="flex-1 px-4 py-3 text-base sm:text-lg bg-error text-error-foreground hover:bg-error/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
                >
                  Exit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
