'use client'

import { Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AdHocExercisePickerModal, {
  type PickerMode,
} from '@/components/adhoc/AdHocExercisePickerModal'
import type { ExerciseDefinition } from '@/components/exercise-selection/ExerciseSearchInterface'
import MuscleBalancePanel from '@/components/features/muscle-balance/MuscleBalancePanel'
import type { MuscleBalanceSnapshot } from '@/components/features/muscle-balance/types'
import { WorkoutRollupModal } from '@/components/features/training/WorkoutRollupModal'
import { useToast } from '@/components/ToastProvider'
import { Button } from '@/components/ui/Button'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import ExerciseActionsFooter from '@/components/workout-logging/ExerciseActionsFooter'
import ExerciseDisplayTabs from '@/components/workout-logging/ExerciseDisplayTabs'
import ExerciseLoggingHeader from '@/components/workout-logging/ExerciseLoggingHeader'
import type { QuickAction } from '@/components/workout-logging/ExerciseQuickActionsMenu'
import ExitWorkoutConfirm from '@/components/workout-logging/ExitWorkoutConfirm'
import SetLoggingForm, {
  type ExpandedInput,
} from '@/components/workout-logging/SetLoggingForm'
import { useIntensityAccess } from '@/hooks/useIntensityAccess'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import {
  addAdHocExercises,
  completeAdHocWorkout,
  deleteAdHocExercise,
  deleteAdHocSet,
  discardAdHocWorkout,
  fetchExerciseHistory,
  logAdHocSet,
  swapAdHocExercise,
} from '@/lib/api/adhoc-workout'
import { FetchError } from '@/lib/api/fetch'
import { clientLogger } from '@/lib/client-logger'
import type { FAUKey } from '@/lib/fau-volume'
import type { WorkoutRollup } from '@/lib/stats/workout-rollup'
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
  muscleBalanceSnapshot: MuscleBalanceSnapshot
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
  muscleBalanceSnapshot,
}: Props) {
  const router = useRouter()
  const toast = useToast()
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
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoggingSet, setIsLoggingSet] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isConfirmingComplete, setIsConfirmingComplete] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [historyByExerciseId, setHistoryByExerciseId] = useState<
    Map<string, ExerciseHistory | null>
  >(new Map())
  const [historyLoadingIds, setHistoryLoadingIds] = useState<Set<string>>(new Set())
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [rollup, setRollup] = useState<WorkoutRollup | null>(null)
  const [showRollup, setShowRollup] = useState(false)
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
    fetchExerciseHistory(exerciseId)
      .then((history) => {
        setHistoryByExerciseId((prev) => {
          const next = new Map(prev)
          next.set(exerciseId, (history as ExerciseHistory | null) ?? null)
          return next
        })
      })
      .catch((err) => {
        // Non-blocking — pre-fill from history is a convenience, not critical.
        clientLogger.error('Failed to load exercise history:', err)
        setHistoryByExerciseId((prev) => {
          const next = new Map(prev)
          next.set(exerciseId, null)
          return next
        })
      })
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

  // Shared onRetry callback so users see a "reconnecting…" toast on slow links
  // before the request either succeeds or terminally fails.
  const onRetryToast = useCallback(
    (label: string) =>
      ({ attempt }: { attempt: number }) => {
        toast.warning('Slow connection', `${label} — retrying (attempt ${attempt + 1})…`)
      },
    [toast]
  )

  const handleAddExercises = useCallback(
    async (definitions: ExerciseDefinition[]) => {
      if (isAdding || definitions.length === 0) return
      setIsAdding(true)
      try {
        const exercises = await addAdHocExercises(
          completionId,
          definitions.map((d) => d.id),
          { onRetry: onRetryToast('Adding exercise') }
        )
        const created: AdHocExercise[] = exercises.map((e) => ({
          id: e.id,
          name: e.name,
          notes: e.notes ?? null,
          exerciseDefinition: {
            primaryFAUs: e.exerciseDefinition.primaryFAUs,
            secondaryFAUs: e.exerciseDefinition.secondaryFAUs,
            equipment: e.exerciseDefinition.equipment,
            instructions: e.exerciseDefinition.instructions ?? undefined,
            imageUrls: e.exerciseDefinition.imageUrls,
          },
        }))
        setExercises((prev) => {
          const next = [...prev, ...created]
          // Focus the first newly-added exercise so the user can start logging.
          setCurrentIndex(prev.length)
          return next
        })
        // New exercise(s) — clear input so history pre-fill can run, and reset
        // any pending input expansion.
        setCurrentSet(EMPTY_SET)
        setExpandedInput(null)
        setPickerMode(null)
      } catch (err) {
        clientLogger.error('Failed to add exercises:', err)
        toast.error(
          "Couldn't add exercise",
          err instanceof FetchError && err.message ? err.message : 'Check your connection and try again.'
        )
      } finally {
        setIsAdding(false)
      }
    },
    [completionId, isAdding, onRetryToast, toast]
  )

  const handleSwapExercise = useCallback(
    async (definitions: ExerciseDefinition[]) => {
      const target = exercises[currentIndex]
      const replacement = definitions[0]
      if (!target || !replacement || isSwapping) return
      setIsSwapping(true)
      try {
        const updated = await swapAdHocExercise(target.id, replacement.id, {
          onRetry: onRetryToast('Swapping exercise'),
        })
        setExercises((prev) =>
          prev.map((ex, i) =>
            i === currentIndex
              ? {
                  ...ex,
                  name: updated.name,
                  exerciseDefinition: {
                    primaryFAUs: updated.exerciseDefinition.primaryFAUs,
                    secondaryFAUs: updated.exerciseDefinition.secondaryFAUs,
                    equipment: updated.exerciseDefinition.equipment,
                    instructions: updated.exerciseDefinition.instructions ?? undefined,
                    imageUrls: updated.exerciseDefinition.imageUrls,
                  },
                }
              : ex
          )
        )
        // Reset input so the new exercise's history can pre-fill.
        setCurrentSet(EMPTY_SET)
        setExpandedInput(null)
        setPickerMode(null)
      } catch (err) {
        clientLogger.error('Failed to swap exercise:', err)
        toast.error(
          "Couldn't swap exercise",
          err instanceof FetchError && err.message ? err.message : 'Check your connection and try again.'
        )
      } finally {
        setIsSwapping(false)
      }
    },
    [currentIndex, exercises, isSwapping, onRetryToast, toast]
  )

  const handleDeleteExercise = useCallback(async () => {
    const target = exercises[currentIndex]
    if (!target || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteAdHocExercise(target.id, {
        onRetry: onRetryToast('Removing exercise'),
      })
      setLoggedSets((prev) => prev.filter((s) => s.exerciseId !== target.id))
      setExercises((prev) => {
        const next = prev.filter((ex) => ex.id !== target.id)
        // Keep currentIndex in range; bias toward the previous exercise.
        setCurrentIndex((idx) => Math.max(0, Math.min(idx, next.length - 1)))
        return next
      })
      setCurrentSet(EMPTY_SET)
      setExpandedInput(null)
    } catch (err) {
      clientLogger.error('Failed to delete exercise:', err)
      toast.error(
        "Couldn't remove exercise",
        err instanceof FetchError && err.message ? err.message : 'Check your connection and try again.'
      )
    } finally {
      setIsDeleting(false)
    }
  }, [currentIndex, exercises, isDeleting, onRetryToast, toast])

  const handleLogSet = useCallback(async () => {
    if (!currentExercise || isLoggingSet) return
    const reps = parseInt(currentSet.reps, 10)
    if (!currentSet.reps || Number.isNaN(reps)) return
    const weight = parseFloat(currentSet.weight) || 0
    const rpe = currentSet.rpe ? parseInt(currentSet.rpe, 10) : null
    const rir = currentSet.rir ? parseInt(currentSet.rir, 10) : null

    // Optimistic append: render the set immediately with a temp id and
    // _syncStatus='pending'. On success we swap in the server id; on terminal
    // failure we mark it 'error' so the user sees that it didn't save.
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticSet: LoggedSet = {
      id: tempId,
      exerciseId: currentExercise.id,
      setNumber: nextSetNumber,
      reps,
      weight,
      weightUnit: currentSet.weightUnit,
      rpe,
      rir,
      isWarmup: false,
      _syncStatus: 'pending',
    }
    setLoggedSets((prev) => [...prev, optimisticSet])
    setExpandedInput(null)
    setIsLoggingSet(true)

    try {
      const saved = await logAdHocSet(
        completionId,
        {
          exerciseId: currentExercise.id,
          setNumber: nextSetNumber,
          reps,
          weight,
          weightUnit: currentSet.weightUnit,
          rpe,
          rir,
        },
        { onRetry: onRetryToast('Saving set') }
      )
      setLoggedSets((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? { ...saved, isWarmup: saved.isWarmup ?? false, _syncStatus: 'synced' }
            : s
        )
      )
    } catch (err) {
      clientLogger.error('Failed to log set:', err)
      setLoggedSets((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, _syncStatus: 'error' } : s))
      )
      toast.error(
        "Set didn't save",
        err instanceof FetchError && err.message
          ? err.message
          : "Couldn't reach the server. Tap the set to retry."
      )
    } finally {
      setIsLoggingSet(false)
    }
  }, [
    currentExercise,
    currentSet,
    nextSetNumber,
    completionId,
    isLoggingSet,
    onRetryToast,
    toast,
  ])

  const handleDeleteSet = useCallback(
    async (setNumber: number) => {
      if (!currentExercise) return
      const target = loggedSets.find(
        (s) => s.exerciseId === currentExercise.id && s.setNumber === setNumber
      )
      if (!target?.id) return

      // Failed-to-sync sets never reached the server; just drop them locally
      // and renumber on the client so the user can re-log.
      if (target._syncStatus === 'error' || target.id.startsWith('tmp-')) {
        setLoggedSets((prev) => {
          const filtered = prev.filter((s) => s.id !== target.id)
          return filtered.map((s) =>
            s.exerciseId === currentExercise.id && s.setNumber > setNumber
              ? { ...s, setNumber: s.setNumber - 1 }
              : s
          )
        })
        return
      }

      // Optimistic remove with rollback on failure.
      const snapshot = loggedSets
      setLoggedSets((prev) => {
        const filtered = prev.filter((s) => s.id !== target.id)
        return filtered.map((s) =>
          s.exerciseId === currentExercise.id && s.setNumber > setNumber
            ? { ...s, setNumber: s.setNumber - 1 }
            : s
        )
      })

      try {
        const data = await deleteAdHocSet(completionId, target.id, {
          onRetry: onRetryToast('Removing set'),
        })
        // Reconcile against server-authoritative renumber output.
        setLoggedSets((prev) => {
          const renumberMap = new Map<string, number>(
            data.renumbered.map((r) => [r.id, r.setNumber])
          )
          return prev.map((s) =>
            s.id && renumberMap.has(s.id)
              ? { ...s, setNumber: renumberMap.get(s.id) as number }
              : s
          )
        })
      } catch (err) {
        clientLogger.error('Failed to delete set:', err)
        setLoggedSets(snapshot)
        toast.error(
          "Couldn't remove set",
          err instanceof FetchError && err.message ? err.message : 'Check your connection and try again.'
        )
      }
    },
    [currentExercise, loggedSets, completionId, onRetryToast, toast]
  )

  // Header check icon → confirmation modal (matches programmed logger).
  // If no sets have been logged, nudge the user to log something first
  // instead of silently doing nothing.
  const handleRequestComplete = useCallback(() => {
    if (loggedSets.length === 0) {
      toast.warning(
        'Log a set first',
        'Add at least one set before completing the workout.'
      )
      return
    }
    setIsConfirmingComplete(true)
  }, [loggedSets.length, toast])

  const handleCompleteWorkout = useCallback(async () => {
    if (isCompleting || loggedSets.length === 0) return

    // Guard: don't let the user complete while there are unsynced sets — they
    // could lose data on bad connections.
    const pendingCount = loggedSets.filter(
      (s) => s._syncStatus === 'pending' || s._syncStatus === 'error'
    ).length
    if (pendingCount > 0) {
      toast.warning(
        'Sets still saving',
        `${pendingCount} set${pendingCount === 1 ? '' : 's'} haven't synced yet. Wait a moment, then try again.`
      )
      return
    }

    setIsCompleting(true)
    try {
      const { rollup: completedRollup } = await completeAdHocWorkout<WorkoutRollup>(
        completionId,
        { onRetry: onRetryToast('Completing workout') }
      )
      setIsConfirmingComplete(false)
      if (completedRollup) {
        setRollup(completedRollup)
        setShowRollup(true)
        return
      }
      router.push('/training')
      router.refresh()
    } catch (err) {
      clientLogger.error('Failed to complete workout:', err)
      toast.error(
        "Couldn't complete workout",
        err instanceof FetchError && err.message
          ? err.message
          : 'Check your connection and try again. Your sets are safe.'
      )
      setIsCompleting(false)
      setIsConfirmingComplete(false)
    }
  }, [isCompleting, loggedSets, completionId, router, onRetryToast, toast])

  const handleRollupClose = useCallback(() => {
    // Navigate first and leave the modal visible so the workout logger
    // beneath it doesn't flash briefly while the route transitions.
    // The component unmounts on navigation, which tears down the modal.
    router.push('/training')
    router.refresh()
  }, [router])

  const handleExitSaveAsDraft = useCallback(() => {
    setShowExitConfirm(false)
    router.push('/training')
  }, [router])

  const handleExitDiscard = useCallback(async () => {
    if (isDiscarding) return
    setIsDiscarding(true)
    try {
      await discardAdHocWorkout(completionId, {
        onRetry: onRetryToast('Discarding workout'),
      })
      setShowExitConfirm(false)
      router.push('/training')
      router.refresh()
    } catch (err) {
      clientLogger.error('Failed to discard ad-hoc workout:', err)
      toast.error(
        "Couldn't discard workout",
        err instanceof FetchError && err.message
          ? err.message
          : 'Check your connection and try again.'
      )
      setIsDiscarding(false)
    }
  }, [completionId, isDiscarding, router, onRetryToast, toast])

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
  const openPickerForFAU = useCallback((fau: FAUKey) => {
    setPickerMode({ kind: 'add', initialFau: fau })
  }, [])

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
    // Disable cross-exercise swipe while an input drawer is open — the
    // carousel chevron and keypad are touch-heavy, swiping there would
    // unintentionally jump to the next/prev exercise.
    enabled: expandedInput === null,
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
      <div
        className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:backdrop-blur-md sm:bg-black/40 sm:dark:bg-black/60"
      >
        <div className="bg-background w-full h-[100dvh] sm:h-[85vh] sm:max-h-[85vh] sm:max-w-2xl sm:border-2 sm:border-border sm:rounded-lg sm:shadow-xl flex flex-col overflow-hidden">
        <ExerciseLoggingHeader
          currentExerciseIndex={hasExercises ? currentIndex : 0}
          totalExercises={Math.max(1, exercises.length)}
          startedAt={startedAt}
          onCompleteWorkout={handleRequestComplete}
          onClose={handleClose}
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
              menuActions={[
                {
                  label: 'Add an exercise',
                  icon: Plus,
                  onClick: () => setPickerMode({ kind: 'add' }),
                },
                {
                  label: 'Swap this exercise',
                  icon: RefreshCw,
                  onClick: () =>
                    setPickerMode({ kind: 'swap', replacingName: currentExercise.name }),
                },
                {
                  label: 'Delete this exercise',
                  icon: Trash2,
                  onClick: handleDeleteExercise,
                  variant: 'danger',
                  requiresConfirmation: true,
                  confirmationMessage: `Are you sure you want to delete "${currentExercise.name}"? Any sets you've logged for it will be removed.`,
                },
              ] satisfies QuickAction[]}
            />
          ) : (
            <EmptyState
              muscleBalanceSnapshot={muscleBalanceSnapshot}
              onSelectFAU={openPickerForFAU}
            />
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
              onClick={() => setPickerMode({ kind: 'add' })}
              className="w-full h-12 bg-primary text-primary-foreground text-base font-bold uppercase tracking-widest transition-all doom-focus-ring inline-flex items-center justify-center gap-2"
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
      </div>

      {pickerMode && (
        <AdHocExercisePickerModal
          mode={pickerMode}
          onClose={() => setPickerMode(null)}
          onConfirm={pickerMode.kind === 'add' ? handleAddExercises : handleSwapExercise}
          isBusy={pickerMode.kind === 'add' ? isAdding : isSwapping}
          muscleBalanceSnapshot={muscleBalanceSnapshot}
        />
      )}
      {showExitConfirm && (
        <ExitWorkoutConfirm
          hasUnsavedWork={totalLoggedSets > 0 || exercises.length > 0}
          onSaveAsDraft={handleExitSaveAsDraft}
          onDiscard={handleExitDiscard}
          onCancel={() => setShowExitConfirm(false)}
          isDiscarding={isDiscarding}
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
      <WorkoutRollupModal
        open={showRollup}
        rollup={rollup}
        onClose={handleRollupClose}
      />
    </>
  )
}

function EmptyState({
  muscleBalanceSnapshot,
  onSelectFAU,
}: {
  muscleBalanceSnapshot: MuscleBalanceSnapshot
  onSelectFAU: (fau: FAUKey) => void
}) {
  const [balanceOpen, setBalanceOpen] = useState(false)
  const topNeglected = muscleBalanceSnapshot.neglected.slice(0, 3)
  const neglectedLabel =
    topNeglected.length > 0
      ? topNeglected.map((item) => item.label).join(', ')
      : 'No clear laggards yet'

  return (
    <div className="flex-1 overflow-auto px-5 py-6">
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-5">
        <div className="flex min-h-[34vh] items-center">
          <TipAnnotation
            icon={<Sparkles aria-hidden="true" size={20} strokeWidth={1.8} />}
          >
            <span className="text-2xl sm:text-3xl leading-relaxed text-foreground">
              Pick your first exercise to start logging. Add as many as you want as you go.
            </span>
          </TipAnnotation>
        </div>

        <section className="border-t-2 border-border pt-4">
          <button
            type="button"
            onClick={() => setBalanceOpen((open) => !open)}
            className="flex min-h-12 w-full items-center justify-between gap-3 text-left doom-focus-ring"
            aria-expanded={balanceOpen}
          >
            <span>
              <span className="block text-lg font-bold uppercase tracking-wider text-accent sm:text-xl">
                Muscle Balance
              </span>
              <span className="block text-sm text-muted-foreground">
                Suggested focus: {neglectedLabel}
              </span>
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {balanceOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          <p className="mt-3 text-sm text-muted-foreground">
            Edit targets in{' '}
            <Link
              href="/settings/muscle-balance"
              className="font-bold uppercase tracking-wider text-foreground underline decoration-border underline-offset-4 doom-focus-ring hover:text-primary"
            >
              Settings &gt; Muscle Balance
            </Link>
            .
          </p>

          {balanceOpen && (
            <div className="mt-4">
              <MuscleBalancePanel
                snapshot={muscleBalanceSnapshot}
                compact
                onSelectFAU={onSelectFAU}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
