'use client'

import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseDefinition } from '@/components/exercise-selection/ExerciseSearchInterface'
import type { MuscleBalanceSnapshot } from '@/components/features/muscle-balance/types'
import { WorkoutRollupModal } from '@/components/features/training/WorkoutRollupModal'
import { useToast } from '@/components/ToastProvider'
import CompleteWorkoutConfirm from '@/components/workout-logging/CompleteWorkoutConfirm'
import ExerciseDisplayTabs from '@/components/workout-logging/ExerciseDisplayTabs'
import ExerciseLoggingHeader from '@/components/workout-logging/ExerciseLoggingHeader'
import type { QuickAction } from '@/components/workout-logging/ExerciseQuickActionsMenu'
import ExitWorkoutConfirm from '@/components/workout-logging/ExitWorkoutConfirm'
import LoggerBottomBar, { pendingSetDetail } from '@/components/workout-logging/LoggerBottomBar'
import SetLoggingForm, {
  type ExpandedInput,
} from '@/components/workout-logging/SetLoggingForm'
import WorkoutPlanEditor, { elapsedSince } from '@/components/workout-logging/WorkoutPlanEditor'
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
  reorderAdHocExercises,
  swapAdHocExercise,
} from '@/lib/api/adhoc-workout'
import { FetchError } from '@/lib/api/fetch'
import { clientLogger } from '@/lib/client-logger'
import type { AnchorStalenessRow } from '@/lib/recommendations/anchor-staleness'
import type { FauNeed } from '@/lib/recommendations/fau-score'
import type { WorkoutRollup } from '@/lib/stats/workout-rollup'
import { type ApplicableSet, appliedSetToForm } from '@/lib/workout/prefill'
import type { LoggedSet } from '@/types/workout'
import {
  AdHocEmptyState,
  AdHocExercisePickerModal,
  type PickerMode,
} from './AdHocExercisePickerModal'

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
    isWarmup: boolean
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
  /** Recovery-aware FAU ranking (#963) for the picker's third sort mode. */
  recoveryRanking?: FauNeed[]
  /** Curated anchor movements + staleness (#976) for the picker's Anchors view. */
  anchors?: AnchorStalenessRow[]
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
  recoveryRanking,
  anchors,
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
  const [planEditorOpen, setPlanEditorOpen] = useState(false)
  const [planElapsed, setPlanElapsed] = useState<string | undefined>(undefined)
  // When the logger opened: the clock's start until the workout has its own (as the header's timer does).
  const openedAt = useRef<string | null>(null)
  useEffect(() => {
    openedAt.current = new Date().toISOString()
  }, [])

  // The plan's clock ticks while the sheet is open, like the header's.
  useEffect(() => {
    if (!planEditorOpen) return
    const id = setInterval(() => setPlanElapsed(elapsedSince(startedAt ?? openedAt.current, Date.now())), 1000)
    return () => clearInterval(id)
  }, [planEditorOpen, startedAt])
  const [isAdding, setIsAdding] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoggingSet, setIsLoggingSet] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isConfirmingComplete, setIsConfirmingComplete] = useState(false)
  // Whole minutes since the start, taken when Complete is tapped (for its summary line).
  const [completeMinutes, setCompleteMinutes] = useState(0)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [historyByExerciseId, setHistoryByExerciseId] = useState<
    Map<string, ExerciseHistory | null>
  >(new Map())
  const [sessionsByExerciseId, setSessionsByExerciseId] = useState<
    Map<string, ExerciseHistory[]>
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
      .then(({ history, sessions }) => {
        setHistoryByExerciseId((prev) => {
          const next = new Map(prev)
          next.set(exerciseId, (history as ExerciseHistory | null) ?? null)
          return next
        })
        setSessionsByExerciseId((prev) => {
          const next = new Map(prev)
          next.set(exerciseId, (sessions as unknown as ExerciseHistory[]) ?? [])
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
        setSessionsByExerciseId((prev) => {
          const next = new Map(prev)
          next.set(exerciseId, [])
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

  // Tap-to-prefill: copy a set's numbers into the form. Used by the "Last time"
  // reference (previous workout) and by tapping an already-logged set this
  // session. Mark the exercise as prefilled so the history effect above won't
  // fire over the tapped-in values.
  const applySetToForm = useCallback(
    (source: ApplicableSet) => {
      if (!currentExercise) return
      prefilledFromHistoryIds.current.add(currentExercise.id)
      const v = appliedSetToForm(source, hasIntensityAccess)
      setCurrentSet(prev => ({ ...prev, ...v, weightUnit: v.weightUnit ?? prev.weightUnit }))
    },
    [currentExercise, hasIntensityAccess]
  )

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
      const targetId =
        pickerMode?.kind === 'swap' && pickerMode.targetId
          ? pickerMode.targetId
          : exercises[currentIndex]?.id
      const target = exercises.find((e) => e.id === targetId)
      const replacement = definitions[0]
      if (!target || !replacement || isSwapping) return
      setIsSwapping(true)
      try {
        const updated = await swapAdHocExercise(target.id, replacement.id, {
          onRetry: onRetryToast('Swapping exercise'),
        })
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === target.id
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
    [currentIndex, exercises, isSwapping, onRetryToast, toast, pickerMode]
  )

  const handleDeleteExercise = useCallback(async (targetId?: string) => {
    const target = targetId
      ? exercises.find((e) => e.id === targetId)
      : exercises[currentIndex]
    if (!target || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteAdHocExercise(target.id, {
        onRetry: onRetryToast('Removing exercise'),
      })
      setLoggedSets((prev) => prev.filter((s) => s.exerciseId !== target.id))
      setExercises((prev) => {
        const removedIdx = prev.findIndex((ex) => ex.id === target.id)
        const next = prev.filter((ex) => ex.id !== target.id)
        // Keep currentIndex pointing at a valid exercise; bias toward previous.
        setCurrentIndex((idx) => {
          if (next.length === 0) return 0
          if (removedIdx < idx) return Math.max(0, idx - 1)
          return Math.min(idx, next.length - 1)
        })
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

  const handleReorderExercises = useCallback(
    async (orderedIds: string[]) => {
      const currentId = exercises[currentIndex]?.id
      setExercises((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e] as const))
        return orderedIds.map((id) => byId.get(id)).filter(Boolean) as AdHocExercise[]
      })
      if (currentId) {
        const nextIdx = orderedIds.indexOf(currentId)
        if (nextIdx >= 0) setCurrentIndex(nextIdx)
      }
      try {
        await reorderAdHocExercises(completionId, orderedIds, {
          onRetry: onRetryToast('Reordering exercises'),
        })
      } catch (err) {
        clientLogger.error('Failed to reorder ad-hoc exercises:', err)
        toast.error(
          "Couldn't save order",
          err instanceof FetchError && err.message
            ? err.message
            : 'Check your connection and try again.'
        )
      }
    },
    [completionId, currentIndex, exercises, onRetryToast, toast]
  )

  const handleJumpToExercise = useCallback(
    (exerciseId: string) => {
      const idx = exercises.findIndex((e) => e.id === exerciseId)
      if (idx >= 0) {
        setCurrentIndex(idx)
        setCurrentSet(EMPTY_SET)
        setExpandedInput(null)
      }
    },
    [exercises]
  )

  const handlePlanSwap = useCallback(
    (exerciseId: string) => {
      const target = exercises.find((e) => e.id === exerciseId)
      if (!target) return
      setPlanEditorOpen(false)
      setPickerMode({ kind: 'swap', replacingName: target.name, targetId: target.id })
    },
    [exercises]
  )

  const handlePlanDelete = useCallback(
    (exerciseId: string) => {
      setPlanEditorOpen(false)
      void handleDeleteExercise(exerciseId)
    },
    [handleDeleteExercise]
  )

  const handlePlanAdd = useCallback(() => {
    setPlanEditorOpen(false)
    setPickerMode({ kind: 'add' })
  }, [])

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
  // Plan sheet rows: every exercise added so far with its logged sets ("2 sets"; freestyle has no plan).
  const planRows = useMemo(
    () =>
      exercises.map((e) => ({
        id: e.id,
        name: e.name,
        setsDone: loggedSets.filter((s) => s.exerciseId === e.id).length,
      })),
    [exercises, loggedSets]
  )

  const handleRequestComplete = useCallback(() => {
    if (loggedSets.length === 0) {
      toast.warning(
        'Log a set first',
        'Add at least one set before completing the workout.'
      )
      return
    }
    setCompleteMinutes(startedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 60_000)) : 0)
    setIsConfirmingComplete(true)
  }, [loggedSets.length, startedAt, toast])

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
          onOpenPlanEditor={
            hasExercises
              ? () => {
                  setPlanElapsed(elapsedSince(startedAt ?? openedAt.current, Date.now()))
                  setPlanEditorOpen(true)
                }
              : undefined
          }
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
              sessions={sessionsByExerciseId.get(currentExercise.id) ?? []}
              historyState={
                historyLoadingIds.has(currentExercise.id)
                  ? 'loading'
                  : historyByExerciseId.has(currentExercise.id)
                    ? 'loaded'
                    : 'pending'
              }
              onDeleteSet={handleDeleteSet}
              onApplySet={applySetToForm}
              loggingForm={
                <SetLoggingForm
                  prescribedSet={undefined}
                  hasRpe={false}
                  hasRir={hasIntensityAccess}
                  currentSet={currentSet}
                  onSetChange={setCurrentSet}
                  expandedInput={expandedInput}
                  onExpandedInputChange={setExpandedInput}
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
                  confirmationTitle: `Delete ${currentExercise.name}?`,
                  confirmationMessage: "Any sets you've logged for it will be removed too.",
                },
              ] satisfies QuickAction[]}
            />
          ) : (
            <AdHocEmptyState />
          )}
        </div>

        {!isInputExpanded && hasExercises && currentExercise && (
          // Every freestyle set is "extra", so the bar is always Log set (never "+ Extra set").
          <LoggerBottomBar
            previous={{ onClick: () => goToExercise(currentIndex - 1), disabled: currentIndex === 0 }}
            main={{
              label: 'Log set',
              detail: pendingSetDetail(currentSet),
              onClick: handleLogSet,
              disabled: currentSet.reps === '' || isLoggingSet,
            }}
            next={{ onClick: () => goToExercise(currentIndex + 1), disabled: currentIndex >= exercises.length - 1 }}
          />
        )}

        {!hasExercises && (
          <LoggerBottomBar main={{ label: 'Add exercise', onClick: () => setPickerMode({ kind: 'add' }) }} />
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
          recoveryRanking={recoveryRanking}
          anchors={anchors}
          plannedExerciseDefinitions={exercises.map((exercise) => ({
            primaryFAUs: exercise.exerciseDefinition.primaryFAUs,
            secondaryFAUs: exercise.exerciseDefinition.secondaryFAUs,
          }))}
        />
      )}
      <WorkoutPlanEditor
        open={planEditorOpen}
        onClose={() => setPlanEditorOpen(false)}
        exercises={planRows}
        elapsed={planElapsed}
        currentExerciseId={exercises[currentIndex]?.id}
        onReorder={handleReorderExercises}
        onJump={handleJumpToExercise}
        onAdd={handlePlanAdd}
        onSwap={handlePlanSwap}
        onDelete={handlePlanDelete}
      />
      {showExitConfirm && (
        <ExitWorkoutConfirm
          hasUnsavedWork={totalLoggedSets > 0 || exercises.length > 0}
          onSaveAsDraft={handleExitSaveAsDraft}
          onDiscard={handleExitDiscard}
          onCancel={() => setShowExitConfirm(false)}
          isDiscarding={isDiscarding}
        />
      )}
      {isConfirmingComplete && (
        <CompleteWorkoutConfirm
          isFollowAlong={false}
          isSubmitting={isCompleting}
          setCount={loggedSets.length}
          durationMinutes={completeMinutes}
          onCancel={() => setIsConfirmingComplete(false)}
          onConfirm={handleCompleteWorkout}
        />
      )}
      <WorkoutRollupModal
        open={showRollup}
        rollup={rollup}
        onClose={handleRollupClose}
      />
    </>
  )
}
