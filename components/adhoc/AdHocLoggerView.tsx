'use client'

import { Plus, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  type ExerciseDefinition,
  ExerciseSearchInterface,
} from '@/components/exercise-selection/ExerciseSearchInterface'
import { Button } from '@/components/ui/Button'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import ExerciseActionsFooter from '@/components/workout-logging/ExerciseActionsFooter'
import ExerciseDisplayTabs from '@/components/workout-logging/ExerciseDisplayTabs'
import ExerciseLoggingHeader from '@/components/workout-logging/ExerciseLoggingHeader'
import ExitWorkoutConfirm from '@/components/workout-logging/ExitWorkoutConfirm'
import SetLoggingForm, {
  type ExpandedInput,
} from '@/components/workout-logging/SetLoggingForm'
import { useIntensityAccess } from '@/hooks/useIntensityAccess'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { clientLogger } from '@/lib/client-logger'
import type { LoggedSet } from '@/types/workout'

export type AdHocExercise = {
  id: string
  name: string
  notes: string | null
  exerciseDefinition: {
    primaryFAUs: string[]
    secondaryFAUs: string[]
    equipment: string[]
    instructions?: string
    imageUrls?: string[]
  }
}

type ExerciseHistory = {
  completedAt: Date
  workoutName: string
  sets: Array<{
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe: number | null
    rir: number | null
  }>
}

type Props = {
  completionId: string
  completionName: string
  startedAt: string | null
  initialExercises: AdHocExercise[]
  initialLoggedSets: Array<{
    id: string
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe: number | null
    rir: number | null
    isWarmup: boolean
  }>
}

const EMPTY_SET = {
  reps: '',
  weight: '',
  weightUnit: 'lbs' as 'lbs' | 'kg',
  rpe: '',
  rir: '',
}

export default function AdHocLoggerView({
  completionId,
  startedAt,
  initialExercises,
  initialLoggedSets,
}: Props) {
  const router = useRouter()
  const { hasAccess: hasIntensityAccess } = useIntensityAccess()

  const [exercises, setExercises] = useState<AdHocExercise[]>(initialExercises)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>(
    initialLoggedSets.map((s) => ({
      id: s.id,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.weightUnit,
      rpe: s.rpe,
      rir: s.rir,
      isWarmup: s.isWarmup,
    }))
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(EMPTY_SET)
  const [expandedInput, setExpandedInput] = useState<ExpandedInput>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoggingSet, setIsLoggingSet] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isConfirmingComplete, setIsConfirmingComplete] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [historyByExerciseId, setHistoryByExerciseId] = useState<
    Map<string, ExerciseHistory | null>
  >(new Map())
  const [historyLoadingIds, setHistoryLoadingIds] = useState<Set<string>>(new Set())
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  // Tracks which exercises we've already pre-filled from history this session,
  // so user typing isn't clobbered when history arrives later.
  const prefilledFromHistoryIds = useRef<Set<string>>(new Set())

  const currentExercise = exercises[currentIndex] ?? null
  const currentExerciseSets = currentExercise
    ? loggedSets.filter((s) => s.exerciseId === currentExercise.id)
    : []
  const nextSetNumber = currentExerciseSets.length + 1
  const totalLoggedSets = loggedSets.length

  // Lazy-load history when the current exercise changes
  useEffect(() => {
    if (!currentExercise) return
    if (historyByExerciseId.has(currentExercise.id)) return
    if (historyLoadingIds.has(currentExercise.id)) return

    const exerciseId = currentExercise.id
    setHistoryLoadingIds((prev) => new Set(prev).add(exerciseId))
    fetch(`/api/exercises/${exerciseId}/history`)
      .then((res) => (res.ok ? res.json() : { history: null }))
      .then((data) => {
        setHistoryByExerciseId((prev) => {
          const next = new Map(prev)
          next.set(exerciseId, data.history ?? null)
          return next
        })
      })
      .catch((err) => clientLogger.error('Failed to load exercise history:', err))
      .finally(() => {
        setHistoryLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(exerciseId)
          return next
        })
      })
  }, [currentExercise, historyByExerciseId, historyLoadingIds])

  // Pre-fill the input from history once history arrives, but only when the
  // user hasn't started typing and there are no logged sets in this session
  // for the current exercise (in-session inheritance handles the rest).
  useEffect(() => {
    if (!currentExercise) return
    if (prefilledFromHistoryIds.current.has(currentExercise.id)) return
    if (currentExerciseSets.length > 0) return
    if (currentSet.reps !== '' || currentSet.weight !== '') return
    const history = historyByExerciseId.get(currentExercise.id)
    if (!history?.sets.length) return
    const lastSet = history.sets[history.sets.length - 1]
    setCurrentSet({
      reps: String(lastSet.reps),
      weight: String(lastSet.weight),
      weightUnit: (lastSet.weightUnit as 'lbs' | 'kg') ?? 'lbs',
      rpe: lastSet.rpe !== null ? String(lastSet.rpe) : '',
      rir: lastSet.rir !== null ? String(lastSet.rir) : '',
    })
    prefilledFromHistoryIds.current.add(currentExercise.id)
  }, [
    currentExercise,
    currentExerciseSets.length,
    historyByExerciseId,
    currentSet.reps,
    currentSet.weight,
  ])

  const handleAddExercise = useCallback(
    async (definition: ExerciseDefinition) => {
      if (isAdding) return
      setIsAdding(true)
      try {
        const res = await fetch(`/api/workouts/adhoc/${completionId}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseDefinitionId: definition.id }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          clientLogger.error('Failed to add exercise:', err)
          return
        }
        const data = await res.json()
        const newExercise: AdHocExercise = {
          id: data.exercise.id,
          name: data.exercise.name,
          notes: data.exercise.notes ?? null,
          exerciseDefinition: {
            primaryFAUs: data.exercise.exerciseDefinition.primaryFAUs,
            secondaryFAUs: data.exercise.exerciseDefinition.secondaryFAUs,
            equipment: data.exercise.exerciseDefinition.equipment,
            instructions: data.exercise.exerciseDefinition.instructions ?? undefined,
            imageUrls: data.exercise.exerciseDefinition.imageUrls,
          },
        }
        setExercises((prev) => {
          const next = [...prev, newExercise]
          setCurrentIndex(next.length - 1)
          return next
        })
        // New exercise — clear input so history pre-fill can run, and reset
        // any pending input expansion.
        setCurrentSet(EMPTY_SET)
        setExpandedInput(null)
        setIsPickerOpen(false)
      } catch (err) {
        clientLogger.error('Failed to add exercise:', err)
      } finally {
        setIsAdding(false)
      }
    },
    [completionId, isAdding]
  )

  const handleLogSet = useCallback(async () => {
    if (!currentExercise || isLoggingSet) return
    const reps = parseInt(currentSet.reps, 10)
    if (!currentSet.reps || Number.isNaN(reps)) return
    const weight = parseFloat(currentSet.weight) || 0
    const rpe = currentSet.rpe ? parseInt(currentSet.rpe, 10) : null
    const rir = currentSet.rir ? parseInt(currentSet.rir, 10) : null

    setIsLoggingSet(true)
    try {
      const res = await fetch(`/api/workouts/adhoc/${completionId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: currentExercise.id,
          setNumber: nextSetNumber,
          reps,
          weight,
          weightUnit: currentSet.weightUnit,
          rpe,
          rir,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        clientLogger.error('Failed to log set:', err)
        return
      }
      const data = await res.json()
      setLoggedSets((prev) => [...prev, { ...data.set, isWarmup: data.set.isWarmup ?? false }])
      // Inherit values into next set: keep currentSet as-is. Only collapse any
      // expanded input so the user is back to the resting compact view.
      setExpandedInput(null)
    } catch (err) {
      clientLogger.error('Failed to log set:', err)
    } finally {
      setIsLoggingSet(false)
    }
  }, [currentExercise, currentSet, nextSetNumber, completionId, isLoggingSet])

  const handleDeleteSet = useCallback(
    async (setNumber: number) => {
      if (!currentExercise) return
      const target = loggedSets.find(
        (s) => s.exerciseId === currentExercise.id && s.setNumber === setNumber
      )
      if (!target) return
      try {
        const res = await fetch(
          `/api/workouts/adhoc/${completionId}/sets/${target.id}`,
          { method: 'DELETE' }
        )
        if (!res.ok) {
          clientLogger.error('Failed to delete set')
          return
        }
        const data = await res.json()
        setLoggedSets((prev) => {
          const filtered = prev.filter((s) => s.id !== target.id)
          const renumberMap = new Map<string, number>(
            (data.renumbered as Array<{ id: string; setNumber: number }>).map((r) => [
              r.id,
              r.setNumber,
            ])
          )
          return filtered.map((s) => {
            if (s.id && renumberMap.has(s.id)) {
              return { ...s, setNumber: renumberMap.get(s.id) as number }
            }
            return s
          })
        })
      } catch (err) {
        clientLogger.error('Failed to delete set:', err)
      }
    },
    [currentExercise, loggedSets, completionId]
  )

  // Header check icon → confirmation modal (matches programmed logger).
  // If no sets have been logged, the workout can't be completed at all, so
  // bail out silently rather than opening the modal.
  const handleRequestComplete = useCallback(() => {
    if (loggedSets.length === 0) return
    setIsConfirmingComplete(true)
  }, [loggedSets.length])

  const handleCompleteWorkout = useCallback(async () => {
    if (isCompleting || loggedSets.length === 0) return
    setIsCompleting(true)
    try {
      const res = await fetch(`/api/workouts/adhoc/${completionId}/complete`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        clientLogger.error('Failed to complete workout:', err)
        setIsCompleting(false)
        return
      }
      router.push('/training')
      router.refresh()
    } catch (err) {
      clientLogger.error('Failed to complete workout:', err)
      setIsCompleting(false)
    }
  }, [isCompleting, loggedSets.length, completionId, router])

  const handleExitSaveAsDraft = useCallback(() => {
    setShowExitConfirm(false)
    router.push('/training')
  }, [router])

  const handleExitDiscard = useCallback(async () => {
    if (isDiscarding) return
    setIsDiscarding(true)
    try {
      await fetch(`/api/workouts/adhoc/${completionId}`, { method: 'DELETE' })
    } catch (err) {
      clientLogger.error('Failed to discard ad-hoc workout:', err)
    }
    setShowExitConfirm(false)
    router.push('/training')
    router.refresh()
  }, [completionId, isDiscarding, router])

  const handleClose = useCallback(() => {
    setShowExitConfirm(true)
  }, [])

  const goToExercise = useCallback(
    (index: number) => {
      if (index < 0 || index >= exercises.length) return
      setCurrentIndex(index)
      setCurrentSet(EMPTY_SET)
      setExpandedInput(null)
    },
    [exercises.length]
  )

  const isInputExpanded = expandedInput !== null
  const hasExercises = exercises.length > 0

  // Swipe + slide-out animation, mirroring the programmed logger.
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(
    null
  )
  const slideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSlide = useCallback(
    (direction: 'left' | 'right', action: () => void) => {
      setSlideDirection(direction)
      if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current)
      slideTimeoutRef.current = setTimeout(() => {
        action()
        setSlideDirection(null)
      }, 150)
    },
    []
  )

  useEffect(
    () => () => {
      if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current)
    },
    []
  )

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => {
      if (currentIndex < exercises.length - 1) {
        triggerSlide('left', () => goToExercise(currentIndex + 1))
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        triggerSlide('right', () => goToExercise(currentIndex - 1))
      }
    },
  })

  return (
    <>
      <div className="fixed inset-0 bg-background flex flex-col" style={{ zIndex: 50 }}>
        <ExerciseLoggingHeader
          currentExerciseIndex={hasExercises ? currentIndex : 0}
          totalExercises={Math.max(1, exercises.length)}
          startedAt={startedAt}
          onCompleteWorkout={handleRequestComplete}
          onClose={handleClose}
          menuActions={[]}
        />

        <div
          className={`flex-1 overflow-hidden flex flex-col transition-transform duration-150 ease-out ${
            slideDirection === 'left'
              ? '-translate-x-4 opacity-80'
              : slideDirection === 'right'
                ? 'translate-x-4 opacity-80'
                : ''
          }`}
          {...swipeHandlers}
        >
          {hasExercises && currentExercise ? (
            <ExerciseDisplayTabs
              exercise={currentExercise}
              prescribedSets={[]}
              loggedSets={currentExerciseSets}
              exerciseHistory={historyByExerciseId.get(currentExercise.id) ?? null}
              historyState={
                historyLoadingIds.has(currentExercise.id)
                  ? 'loading'
                  : historyByExerciseId.has(currentExercise.id)
                    ? 'loaded'
                    : 'pending'
              }
              onDeleteSet={handleDeleteSet}
              loggingForm={
                <SetLoggingForm
                  prescribedSet={undefined}
                  hasLoggedAllPrescribed={false}
                  extraSetsMode={true}
                  hasRpe={false}
                  hasRir={hasIntensityAccess}
                  currentSet={currentSet}
                  onSetChange={setCurrentSet}
                  expandedInput={expandedInput}
                  onExpandedInputChange={setExpandedInput}
                  onExtraSets={() => {}}
                  onNextExercise={() => {}}
                  onCompleteWorkout={handleCompleteWorkout}
                  isLastExercise={currentIndex === exercises.length - 1}
                />
              }
              isInputExpanded={isInputExpanded}
              showIntensity={hasIntensityAccess}
              currentSetNumber={nextSetNumber}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        {!isInputExpanded && hasExercises && currentExercise && (
          <ExerciseActionsFooter
            currentExerciseIndex={currentIndex}
            totalExercises={exercises.length}
            nextSetNumber={nextSetNumber}
            canLogSet={currentSet.reps !== '' && !isLoggingSet}
            hasLoggedAllPrescribed={false}
            extraSetsMode={true}
            onLogSet={handleLogSet}
            onPrevious={() => goToExercise(currentIndex - 1)}
            onNext={() => goToExercise(currentIndex + 1)}
            onAddExercise={() => setIsPickerOpen(true)}
          />
        )}

        {!hasExercises && (
          <div
            className="bg-secondary px-4 py-3 flex-shrink-0"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.25)',
              paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="w-full h-11 bg-primary text-primary-foreground text-sm font-medium uppercase tracking-widest transition-all doom-focus-ring inline-flex items-center justify-center gap-2"
              style={{
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)',
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              Add Exercise
            </button>
          </div>
        )}
      </div>

      {isPickerOpen && (
        <ExercisePickerModal
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleAddExercise}
        />
      )}
      {showExitConfirm && (
        <ExitWorkoutConfirm
          hasUnsavedWork={totalLoggedSets > 0 || exercises.length > 0}
          onSaveAsDraft={handleExitSaveAsDraft}
          onDiscard={handleExitDiscard}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
      {isConfirmingComplete &&
        createPortal(
          <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-card border-2 border-border p-6 sm:p-8 text-center min-w-[300px] max-w-sm w-full shadow-xl doom-corners">
              {!isCompleting ? (
                <>
                  <p className="text-lg sm:text-xl mb-6 text-foreground font-bold uppercase tracking-wider">
                    Complete this workout?
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      doom
                      onClick={() => setIsConfirmingComplete(false)}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 text-base font-bold uppercase tracking-wider border-2 border-border hover:border-primary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="success"
                      doom
                      onClick={handleCompleteWorkout}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 text-base font-bold uppercase tracking-wider"
                    >
                      Confirm
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex justify-center">
                    <LoadingFrog size={64} speed={0.8} />
                  </div>
                  <p className="text-foreground uppercase tracking-wider font-bold">
                    Completing workout…
                  </p>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-8">
      <TipAnnotation
        icon={<Sparkles aria-hidden="true" size={20} strokeWidth={1.8} />}
      >
        <span className="text-xl sm:text-2xl leading-relaxed text-foreground">
          Pick your first exercise to start logging. Add as many as you want as you go.
        </span>
      </TipAnnotation>
    </div>
  )
}

function ExercisePickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (def: ExerciseDefinition) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80 }}
      className="bg-background flex flex-col"
    >
      <div
        className="bg-secondary text-secondary-foreground px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="p-1 doom-focus-ring"
          aria-label="Cancel"
        >
          <X size={20} />
        </button>
        <span className="text-sm font-bold uppercase tracking-wider">Pick exercise</span>
        <span className="w-7" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <ExerciseSearchInterface onExerciseSelect={onSelect} preloadExercises />
      </div>
    </div>,
    document.body
  )
}
