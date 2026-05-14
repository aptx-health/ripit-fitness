'use client'

import { AlertTriangle, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  type ExerciseDefinition,
  ExerciseSearchInterface,
} from '@/components/exercise-selection/ExerciseSearchInterface'
import ExerciseActionsFooter from '@/components/workout-logging/ExerciseActionsFooter'
import ExerciseDisplayTabs from '@/components/workout-logging/ExerciseDisplayTabs'
import ExerciseLoggingHeader from '@/components/workout-logging/ExerciseLoggingHeader'
import SetLoggingForm, {
  type ExpandedInput,
} from '@/components/workout-logging/SetLoggingForm'
import { useIntensityAccess } from '@/hooks/useIntensityAccess'
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
  const [isPickerOpen, setIsPickerOpen] = useState(initialExercises.length === 0)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoggingSet, setIsLoggingSet] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [historyByExerciseId, setHistoryByExerciseId] = useState<
    Map<string, ExerciseHistory | null>
  >(new Map())
  const [historyLoadingIds, setHistoryLoadingIds] = useState<Set<string>>(new Set())
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const currentExercise = exercises[currentIndex] ?? null
  const currentExerciseSets = currentExercise
    ? loggedSets.filter((s) => s.exerciseId === currentExercise.id)
    : []
  const nextSetNumber = currentExerciseSets.length + 1

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
      setCurrentSet({ ...EMPTY_SET, weightUnit: currentSet.weightUnit })
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
          // Remove target, then apply server-reported renumbering.
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

  const handleCompleteWorkout = useCallback(async () => {
    if (isCompleting) return
    if (loggedSets.length === 0) {
      setShowExitConfirm(true)
      return
    }
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

  if (exercises.length === 0) {
    // Empty state — show picker as the dominant action. The picker also opens
    // automatically via initial state.
    return (
      <>
        <div className="bg-background min-h-screen flex flex-col">
          <div className="bg-secondary text-secondary-foreground px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="p-1 doom-focus-ring"
              aria-label="Exit"
            >
              <X size={20} />
            </button>
            <span className="text-sm font-bold uppercase tracking-wider">
              Freestyle Workout
            </span>
            <span className="w-7" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
            <h2 className="text-2xl font-bold text-foreground doom-heading">
              Pick your first exercise
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Search for any exercise, then log sets as you go. Add more exercises
              whenever you're ready.
            </p>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              <Plus size={18} />
              Pick exercise
            </button>
          </div>
        </div>
        {isPickerOpen && (
          <ExercisePickerModal
            onClose={() => {
              if (exercises.length > 0) setIsPickerOpen(false)
            }}
            onSelect={handleAddExercise}
            allowClose={false}
          />
        )}
        {showExitConfirm && (
          <ExitConfirmModal
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={() => router.push('/training')}
          />
        )}
      </>
    )
  }

  if (!currentExercise) return null

  const isInputExpanded = expandedInput !== null
  const showLogSetButton = currentSet.reps !== '' && !isInputExpanded

  return (
    <>
      <div className="fixed inset-0 bg-background flex flex-col" style={{ zIndex: 50 }}>
        <ExerciseLoggingHeader
          currentExerciseIndex={currentIndex}
          totalExercises={exercises.length}
          startedAt={startedAt}
          onCompleteWorkout={handleCompleteWorkout}
          onClose={handleClose}
          menuActions={[
            {
              label: 'Add another exercise',
              icon: Plus,
              onClick: () => setIsPickerOpen(true),
            },
          ]}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
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
        </div>

        {!isInputExpanded && (
          <ExerciseActionsFooter
            currentExerciseIndex={currentIndex}
            totalExercises={exercises.length}
            nextSetNumber={nextSetNumber}
            canLogSet={showLogSetButton && !isLoggingSet}
            hasLoggedAllPrescribed={false}
            extraSetsMode={true}
            onLogSet={handleLogSet}
            onPrevious={() => goToExercise(currentIndex - 1)}
            onNext={() => goToExercise(currentIndex + 1)}
          />
        )}
      </div>

      {isPickerOpen && (
        <ExercisePickerModal
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleAddExercise}
          allowClose
        />
      )}
      {showExitConfirm && (
        <ExitConfirmModal
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => router.push('/training')}
        />
      )}
    </>
  )
}

function ExercisePickerModal({
  onClose,
  onSelect,
  allowClose,
}: {
  onClose: () => void
  onSelect: (def: ExerciseDefinition) => void
  allowClose: boolean
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
      <div className="bg-secondary text-secondary-foreground px-4 py-3 flex items-center justify-between flex-shrink-0">
        {allowClose ? (
          <button
            type="button"
            onClick={onClose}
            className="p-1 doom-focus-ring"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        ) : (
          <span className="w-7" />
        )}
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

function ExitConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 90 }}
      className="bg-background/80 backdrop-blur-md flex items-center justify-center px-4"
    >
      <div className="bg-card border-2 border-border doom-corners w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-foreground doom-heading uppercase tracking-wider mb-1">
              Leave workout?
            </h3>
            <p className="text-sm text-muted-foreground">
              Your draft is saved. You can resume it from the bottom nav anytime.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 bg-muted text-foreground font-semibold uppercase tracking-wider text-sm doom-focus-ring"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm doom-button-3d doom-focus-ring"
          >
            Leave
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
