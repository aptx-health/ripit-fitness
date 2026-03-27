'use client'

import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { type Exercise, type ExerciseHistory, useProgressiveExercises } from '@/hooks/useProgressiveExercises'
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft'
import { completeDraft, discardDraft } from '@/lib/api/workout-sets'
import type { LoggedSet } from '@/types/workout'
import ExerciseDefinitionEditorModal from './features/exercise-definition/ExerciseDefinitionEditorModal'
import ExerciseActionsFooter from './workout-logging/ExerciseActionsFooter'
import ExerciseDisplayTabs from './workout-logging/ExerciseDisplayTabs'
import ExerciseLoggingHeader from './workout-logging/ExerciseLoggingHeader'
import ExerciseNavigation from './workout-logging/ExerciseNavigation'
import SetLoggingForm from './workout-logging/SetLoggingForm'
import { AddExerciseWizard } from './workout-logging/wizards/AddExerciseWizard'
import { DeleteExerciseWizard } from './workout-logging/wizards/DeleteExerciseWizard'
import { EditExerciseWizard } from './workout-logging/wizards/EditExerciseWizard'
import { SwapExerciseWizard } from './workout-logging/wizards/SwapExerciseWizard'

// Re-export types for external use
export type { Exercise, ExerciseHistory, LoggedSet }

type Props = {
  isOpen: boolean
  onClose: (workoutUpdated?: boolean) => void
  workoutId: string
  workoutName: string
  exerciseCount: number
  workoutCompletionId?: string
  initialExercise?: Exercise | null
  initialHistory?: ExerciseHistory | null
  onComplete: () => Promise<void>
  onRefresh?: () => Promise<void>
}

export default function ExerciseLoggingModal({
  isOpen,
  onClose,
  workoutId,
  exerciseCount,
  workoutCompletionId,
  initialExercise,
  initialHistory,
  onComplete,
  onRefresh,
}: Props) {
  const [currentSet, setCurrentSet] = useState({
    reps: '',
    weight: '',
    weightUnit: 'lbs' as 'lbs' | 'kg',
    rpe: '',
    rir: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
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
  const [editingExerciseDefinitionId, setEditingExerciseDefinitionId] = useState<string | null>(null)

  // Progressive loading of exercises
  const {
    currentExercise,
    currentExerciseState,
    currentIndex,
    totalExercises,
    goToExercise,
    goToNext,
    goToPrevious,
    currentExerciseHistory,
    currentHistoryState,
    hasHistoryForCurrentExercise,
    refreshExercises,
  } = useProgressiveExercises(workoutId, exerciseCount, workoutCompletionId, {
    initialExercise: initialExercise ?? undefined,
    initialHistory: initialHistory ?? undefined,
  })

  // DB-first persistence with write-through localStorage cache
  const {
    loggedSets,
    isHydrating,
    failedSetCount,
    logSet,
    deleteSet,
    flushFailedSets,
    clearCache,
  } = useWorkoutDraft(workoutId)

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
    if (!currentSet.reps || !currentSet.weight || !currentExercise) return

    logSet({
      exerciseId: currentExercise.id,
      setNumber: nextSetNumber,
      reps: parseInt(currentSet.reps, 10),
      weight: parseFloat(currentSet.weight),
      weightUnit: currentSet.weightUnit,
      rpe: currentSet.rpe ? parseInt(currentSet.rpe, 10) : null,
      rir: currentSet.rir ? parseInt(currentSet.rir, 10) : null,
    })

    // Reset form
    setCurrentSet({
      reps: '',
      weight: '',
      weightUnit: currentSet.weightUnit,
      rpe: '',
      rir: '',
    })
  }, [currentSet, currentExercise, nextSetNumber, logSet])

  const handleNextExercise = () => {
    goToNext()
    setCurrentSet({ reps: '', weight: '', weightUnit: 'lbs', rpe: '', rir: '' })
  }

  const handlePreviousExercise = () => {
    goToPrevious()
    setCurrentSet({ reps: '', weight: '', weightUnit: 'lbs', rpe: '', rir: '' })
  }

  const handleReplaceExercise = () => setActiveWizard('swap')
  const handleAddExercise = () => setActiveWizard('add')
  const handleDeleteExercise = () => setActiveWizard('delete')
  const handleEditExercise = () => setActiveWizard('edit')

  const handleEditExerciseDefinition = () => {
    if (currentExercise?.exerciseDefinition && !currentExercise.exerciseDefinition.isSystem) {
      setEditingExerciseDefinitionId(currentExercise.exerciseDefinition.id)
    }
  }

  const handleExitWorkout = () => setShowExitConfirm(true)

  const handleExitSaveAsDraft = async () => {
    setShowExitConfirm(false)
    // Attempt to persist any failed sets before closing
    if (failedSetCount > 0) {
      await flushFailedSets()
    }
    onClose(true)
  }

  const handleExitDiscard = async () => {
    setShowExitConfirm(false)
    try {
      await discardDraft(workoutId)
    } catch {
      // Best effort — draft may not exist yet if no sets were logged
    }
    clearCache()
    onClose()
  }

  const handleWizardComplete = async () => {
    if (onRefresh) {
      await onRefresh()
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    refreshExercises()
    if (activeWizard === 'add') {
      setNavigateToLastExercise(true)
    }
    setActiveWizard(null)
  }

  const handleCompleteWorkout = async () => {
    setIsSubmitting(true)
    try {
      // Pass fallback sets if any per-set writes failed
      const fallback = failedSetCount > 0 ? loggedSets : undefined
      await completeDraft(workoutId, fallback)
      clearCache()
      await onComplete()
      onClose()
    } catch (error) {
      console.error('Error completing workout:', error)
      alert('Failed to save workout. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSet = useCallback((setNumber: number) => {
    if (!currentExercise) return

    const exerciseId = currentExercise.id
    const exerciseSets = loggedSets.filter(s => s.exerciseId === exerciseId)

    if (exerciseSets.length === 1) {
      setShowDeleteConfirm({ show: true, exerciseId, setNumber, isDeleteAll: false })
      return
    }

    performDeleteSet(exerciseId, setNumber)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise?.id, loggedSets, currentExercise])

  const performDeleteSet = useCallback((exerciseId: string, setNumber: number) => {
    const set = loggedSets.find(
      s => s.exerciseId === exerciseId && s.setNumber === setNumber
    )
    deleteSet(set?.id, exerciseId, setNumber)
  }, [loggedSets, deleteSet])

  const handleConfirmDelete = useCallback(() => {
    if (showDeleteConfirm.exerciseId && showDeleteConfirm.setNumber) {
      performDeleteSet(showDeleteConfirm.exerciseId, showDeleteConfirm.setNumber)
    }
    setShowDeleteConfirm({ show: false })
  }, [showDeleteConfirm, performDeleteSet])

  // Handle exercise deletion - adjust index if current exercise was deleted
  useEffect(() => {
    if (!isOpen || totalExercises === 0) {
      if (isOpen && totalExercises === 0) onClose()
      return
    }
    if (currentExerciseState === 'loaded' && !currentExercise && totalExercises > 0) {
      goToExercise(currentIndex > 0 ? currentIndex - 1 : 0)
    }
  }, [isOpen, totalExercises, currentIndex, currentExercise, currentExerciseState, goToExercise, onClose])

  // Navigate to newly added exercise
  useEffect(() => {
    if (navigateToLastExercise && totalExercises > 0) {
      goToExercise(totalExercises - 1)
      setNavigateToLastExercise(false)
    }
  }, [navigateToLastExercise, totalExercises, goToExercise])

  // Wait for hydration before rendering content
  if (isHydrating) {
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

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center">
        {/* Modal - Full screen on mobile, centered on desktop */}
        <div className="bg-card w-full h-[100dvh] sm:h-[85vh] sm:max-h-[85vh] sm:max-w-2xl sm:border-2 sm:border-border sm:rounded-lg flex flex-col shadow-xl">
          {/* Header */}
          <ExerciseLoggingHeader
            currentExerciseIndex={currentIndex}
            totalExercises={totalExercises}
            failedSetCount={failedSetCount}
          />

          {/* Exercise Navigation */}
          {currentExercise ? (
            <ExerciseNavigation
              currentExercise={currentExercise}
              currentExerciseIndex={currentIndex}
              totalExercises={totalExercises}
              onPrevious={handlePreviousExercise}
              onNext={handleNextExercise}
            />
          ) : (
            <div className="px-4 py-3 border-b border-border">
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          )}

          {/* Content area with tabs */}
          <div className="flex-1 overflow-hidden pb-2">
            {currentExerciseState === 'loading' || currentExerciseState === 'pending' ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <LoadingFrog size={48} speed={0.8} />
                <p className="mt-4 text-muted-foreground uppercase tracking-wider font-bold animate-pulse">
                  Loading exercise...
                </p>
              </div>
            ) : currentExerciseState === 'error' ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <AlertTriangle size={48} className="text-error mb-4" />
                <p className="text-error uppercase tracking-wider font-bold">
                  Failed to load exercise
                </p>
                <button type="button"
                  onClick={() => refreshExercises()}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider"
                >
                  Retry
                </button>
              </div>
            ) : currentExercise ? (
              <ExerciseDisplayTabs
                exercise={currentExercise}
                prescribedSets={currentPrescribedSets}
                loggedSets={currentExerciseLoggedSets}
                exerciseHistory={currentExerciseHistory}
                historyState={currentHistoryState}
                hasHistoryIndicator={hasHistoryForCurrentExercise}
                onDeleteSet={handleDeleteSet}
                loggingForm={
                  <SetLoggingForm
                    prescribedSet={prescribedSet}
                    hasLoggedAllPrescribed={hasLoggedAllPrescribed}
                    hasRpe={hasRpe}
                    hasRir={hasRir}
                    currentSet={currentSet}
                    onSetChange={setCurrentSet}
                  />
                }
              />
            ) : null}
          </div>

          {/* Actions Footer */}
          <ExerciseActionsFooter
            currentExerciseName={currentExercise?.name || 'Exercise'}
            nextSetNumber={nextSetNumber}
            totalLoggedSets={totalLoggedSets}
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

          {/* Workout completion confirmation */}
          {isConfirming && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
              <div className="bg-card border-2 border-border p-6 sm:p-8 text-center min-w-[300px] shadow-xl doom-corners">
                {!isSubmitting ? (
                  <>
                    <p className="text-lg sm:text-xl mb-6 text-foreground font-bold uppercase tracking-wider">Complete this workout?</p>
                    <div className="flex justify-center gap-3">
                      <button type="button"
                        onClick={() => setIsConfirming(false)}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 text-base bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                      >
                        Cancel
                      </button>
                      <button type="button"
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

          {/* Deletion confirmation */}
          {showDeleteConfirm.show && (
            <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
              <div className="bg-card border-2 border-error p-6 sm:p-8 text-center max-w-sm shadow-xl doom-corners">
                <div className="text-warning mb-4">
                  <svg aria-hidden="true" className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 uppercase tracking-wider">Delete Last Set?</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  This will remove the only remaining set for this exercise. Are you sure?
                </p>
                <div className="flex justify-center gap-3">
                  <button type="button"
                    onClick={() => setShowDeleteConfirm({ show: false })}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-base bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                  >
                    Cancel
                  </button>
                  <button type="button"
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

      {/* Exercise Definition Editor Modal */}
      <ExerciseDefinitionEditorModal
        isOpen={!!editingExerciseDefinitionId}
        onClose={() => setEditingExerciseDefinitionId(null)}
        mode="edit"
        exerciseId={editingExerciseDefinitionId || undefined}
        onSuccess={() => {
          setEditingExerciseDefinitionId(null)
          if (onRefresh) onRefresh()
        }}
      />

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
          isSystemExercise={currentExercise.exerciseDefinition?.isSystem ?? true}
          onEditExercise={handleEditExerciseDefinition}
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

      {/* Exit workout confirmation */}
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
                <button type="button"
                  onClick={handleExitSaveAsDraft}
                  className="w-full px-4 py-3 text-base sm:text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
                >
                  Save as Draft
                </button>
                <button type="button"
                  onClick={handleExitDiscard}
                  className="w-full px-4 py-3 text-base sm:text-lg bg-error text-error-foreground hover:bg-error/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
                >
                  Discard All
                </button>
                <button type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full px-4 py-3 text-base sm:text-lg bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-3 text-base sm:text-lg bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
                >
                  Cancel
                </button>
                <button type="button"
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
