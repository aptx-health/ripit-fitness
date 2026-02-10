'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import WeekNavigator from '@/components/ui/WeekNavigator'
import ActionsMenu from '@/components/ActionsMenu'
import WorkoutPreviewModal from '@/components/WorkoutPreviewModal'
import ExerciseLoggingModal from '@/components/ExerciseLoggingModal'
import { ProgramCompletionModal } from '@/components/ProgramCompletionModal'
import { useWorkoutStorage } from '@/hooks/useWorkoutStorage'
import WorkoutCard from '@/components/workout/WorkoutCard'
import { clientLogger } from '@/lib/client-logger'

type Workout = {
  id: string
  dayNumber: number
  name: string
  completions: Array<{
    id: string
    status: string
    completedAt: Date
  }>
  _count: {
    exercises: number
  }
}

type Week = {
  id: string
  weekNumber: number
  workouts: Workout[]
}

type Props = {
  programId: string
  programName: string
  week: Week
  totalWeeks: number
}

type ModalMode = 'preview' | 'logging' | null

type FetchedWorkoutData = {
  workout: {
    id: string
    name: string
    dayNumber: number
    exercises: Array<{
      id: string
      name: string
      order: number
      exerciseGroup: string | null
      notes: string | null
      isOneOff?: boolean
      exerciseDefinitionId: string
      exerciseDefinition?: {
        id: string
        name: string
        primaryFAUs: string[]
        secondaryFAUs: string[]
        equipment: string[]
        instructions?: string
        isSystem: boolean
        createdBy: string | null
      }
      prescribedSets: Array<{
        id: string
        setNumber: number
        reps: string
        weight: string | null
        rpe: number | null
        rir: number | null
      }>
    }>
    completions: Array<{
      id: string
      status: string
      completedAt: Date
      loggedSets: Array<{
        id: string
        setNumber: number
        reps: number
        weight: number
        weightUnit: string
        rpe: number | null
        rir: number | null
        exerciseId: string
      }>
    }>
  }
  exerciseHistory?: Record<string, unknown>
}

// Metadata for progressive loading modal
type WorkoutMetadata = {
  workout: {
    id: string
    name: string
    dayNumber: number
    programId: string
  }
  exerciseCount: number
  completionId?: string
  completionStatus?: string
  firstExercise?: {
    id: string
    name: string
    order: number
    exerciseGroup: string | null
    notes: string | null
    isOneOff?: boolean
    exerciseDefinitionId: string
    exerciseDefinition?: {
      id: string
      name: string
      primaryFAUs: string[]
      secondaryFAUs: string[]
      equipment: string[]
      instructions?: string
      isSystem: boolean
      createdBy: string | null
    }
    prescribedSets: Array<{
      id: string
      setNumber: number
      reps: string
      weight: string | null
      rpe: number | null
      rir: number | null
    }>
  } | null
  firstExerciseHistory?: {
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
  } | null
}

export default function StrengthWeekView({
  programId,
  programName,
  week,
  totalWeeks
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [updatingWorkoutId, setUpdatingWorkoutId] = useState<string | null>(null)
  const [skippingWorkout, setSkippingWorkout] = useState<string | null>(null)
  const [unskippingWorkout, setUnskippingWorkout] = useState<string | null>(null)
  const [completingWeek, setCompletingWeek] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [workoutData, setWorkoutData] = useState<FetchedWorkoutData | null>(null)
  const [workoutMetadata, setWorkoutMetadata] = useState<WorkoutMetadata | null>(null)
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false)
  const [modalKey, setModalKey] = useState(0)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isProgramComplete, setIsProgramComplete] = useState(false)

  // For clearing localStorage when resetting workout
  const { clearStoredWorkout } = useWorkoutStorage(selectedWorkoutId || '')

  const checkProgramCompletion = useCallback(async (openModal = false) => {
    // Skip check if we're currently restarting
    if (isRestarting) return

    try {
      const response = await fetch(`/api/programs/${programId}/completion-status`)
      if (!response.ok) return

      const { data } = await response.json()
      setIsProgramComplete(data.isComplete)

      if (data.isComplete && openModal && !isRestarting) {
        setShowCompletionModal(true)
      }
    } catch (error) {
      clientLogger.error('Error checking program completion:', error)
    }
  }, [programId, isRestarting])

  // Check program completion status on mount
  useEffect(() => {
    checkProgramCompletion(false)
  }, [checkProgramCompletion])

  // Clear updating workout ID when transition completes
  useEffect(() => {
    if (!isPending && updatingWorkoutId) {
      setUpdatingWorkoutId(null)
    }
  }, [isPending, updatingWorkoutId])

  const handleProgramRestart = useCallback(() => {
    // Set restarting flag to prevent completion checks
    setIsRestarting(true)
    setShowCompletionModal(false)
    setIsProgramComplete(false)

    // Navigate to week 1 and force a full page refresh
    router.push('/training?week=1')

    // Refresh after navigation completes
    setTimeout(() => {
      router.refresh()
      // Reset restarting flag after refresh
      setIsRestarting(false)
    }, 200)
  }, [router])

  // Fetch full workout data for preview modal
  const fetchWorkoutData = useCallback(async (workoutId: string, includeHistory: boolean) => {
    setIsLoadingWorkout(true)
    try {
      const url = `/api/workouts/${workoutId}${includeHistory ? '?includeHistory=true' : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch workout')
      const data = await response.json()
      setWorkoutData(data)
      return data
    } catch (error) {
      clientLogger.error('Error fetching workout:', error)
      return null
    } finally {
      setIsLoadingWorkout(false)
    }
  }, [])

  // Fetch just metadata for logging modal (fast initial load)
  const fetchWorkoutMetadata = useCallback(async (workoutId: string) => {
    setIsLoadingWorkout(true)
    try {
      const response = await fetch(`/api/workouts/${workoutId}/metadata`)
      if (!response.ok) throw new Error('Failed to fetch workout metadata')
      const data: WorkoutMetadata = await response.json()
      setWorkoutMetadata(data)
      return data
    } catch (error) {
      clientLogger.error('Error fetching workout metadata:', error)
      return null
    } finally {
      setIsLoadingWorkout(false)
    }
  }, [])

  const handleOpenPreview = async (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    const data = await fetchWorkoutData(workoutId, false)
    if (data) setModalMode('preview')
  }

  // Opens logging modal with progressive loading (fast!)
  const handleOpenLogging = async (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    const metadata = await fetchWorkoutMetadata(workoutId)
    if (!metadata) return

    // Safety check: If workout is already completed, open preview instead
    if (metadata.completionStatus === 'completed') {
      clientLogger.info('Workout already completed, opening preview instead')
      const data = await fetchWorkoutData(workoutId, false)
      if (data) setModalMode('preview')
      return
    }

    setModalMode('logging')
  }

  const handleCloseModal = (workoutUpdated = false) => {
    const workoutId = selectedWorkoutId
    setModalMode(null)
    setSelectedWorkoutId(null)
    setWorkoutData(null)
    setWorkoutMetadata(null)

    if (workoutUpdated && workoutId) {
      // Track which workout is updating and use transition to show loading until refresh completes
      setUpdatingWorkoutId(workoutId)
      startTransition(() => {
        router.refresh()
      })
    } else {
      router.refresh()
    }
  }

  const handleStartLoggingFromPreview = async () => {
    if (!selectedWorkoutId) return
    // Fetch metadata for logging modal
    const metadata = await fetchWorkoutMetadata(selectedWorkoutId)
    if (!metadata) return

    // Safety check: If workout is already completed, stay in preview
    if (metadata.completionStatus === 'completed') {
      clientLogger.info('Workout already completed, cannot start logging')
      return
    }

    setModalMode('logging')
  }

  const handleCompleteWorkout = async (loggedSets: Array<{
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe: number | null
    rir: number | null
  }>) => {
    if (!selectedWorkoutId) return
    const response = await fetch(`/api/workouts/${selectedWorkoutId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loggedSets }),
    })
    if (!response.ok) throw new Error('Failed to complete workout')
    handleCloseModal(true) // Pass true to indicate workout was updated
    await checkProgramCompletion(true)
  }

  const handleClearWorkout = async () => {
    if (!selectedWorkoutId) return
    const response = await fetch(`/api/workouts/${selectedWorkoutId}/clear`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to clear workout')
    clearStoredWorkout()
    setModalKey(prev => prev + 1)
    // Refetch the workout data/metadata
    if (modalMode === 'preview') {
      const data = await fetchWorkoutData(selectedWorkoutId, false)
      setWorkoutData(data)
    } else if (modalMode === 'logging') {
      const metadata = await fetchWorkoutMetadata(selectedWorkoutId)
      setWorkoutMetadata(metadata)
    }
    router.refresh()
  }

  const handleSkipWorkout = async (workoutId: string) => {
    setSkippingWorkout(workoutId)
    try {
      const response = await fetch(`/api/workouts/${workoutId}/skip`, { method: 'POST' })
      if (response.ok) {
        router.refresh()
        await checkProgramCompletion(true)
      }
    } finally {
      setSkippingWorkout(null)
    }
  }

  const handleUnskipWorkout = async (workoutId: string) => {
    setUnskippingWorkout(workoutId)
    try {
      const response = await fetch(`/api/workouts/${workoutId}/clear`, { method: 'POST' })
      if (response.ok) router.refresh()
    } finally {
      setUnskippingWorkout(null)
    }
  }

  const handleCompleteWeek = async () => {
    setCompletingWeek(true)
    try {
      const response = await fetch(`/api/weeks/${week.id}/complete`, { method: 'POST' })
      if (response.ok) {
        router.refresh()
        await checkProgramCompletion(true)
      }
    } finally {
      setCompletingWeek(false)
    }
  }

  // Refresh handler for when exercises change in the modal
  const handleRefreshMetadata = useCallback(async () => {
    if (!selectedWorkoutId) return
    const metadata = await fetchWorkoutMetadata(selectedWorkoutId)
    if (metadata) {
      setWorkoutMetadata(metadata)
    }
  }, [selectedWorkoutId, fetchWorkoutMetadata])

  const hasIncompleteWorkouts = week.workouts.some(w => w.completions.length === 0)
  const weekActions = hasIncompleteWorkouts
    ? [{
        label: 'Complete Week',
        icon: CheckCircle,
        onClick: handleCompleteWeek,
        requiresConfirmation: true,
        confirmationMessage: 'This will mark all remaining workouts as skipped. Are you sure?',
        variant: 'warning' as const,
        disabled: completingWeek
      }]
    : []

  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <WeekNavigator
          currentWeek={week.weekNumber}
          totalWeeks={totalWeeks}
          baseUrl="/training"
          programName={programName}
          actions={weekActions.length > 0 ? <ActionsMenu actions={weekActions} size="sm" /> : undefined}
          completionIndicator={
            isProgramComplete ? (
              <button
                onClick={() => setShowCompletionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground border-2 border-success hover:bg-success-hover font-bold text-sm uppercase tracking-wider transition-all"
                title="View completion stats and restart program"
              >
                <CheckCircle size={20} />
                <span className="hidden sm:inline">Complete</span>
              </button>
            ) : undefined
          }
        />
      </div>

      <div className="space-y-3">
        {week.workouts.map(workout => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            isSkipping={skippingWorkout === workout.id}
            isUnskipping={unskippingWorkout === workout.id}
            isLoading={(isLoadingWorkout && selectedWorkoutId === workout.id) || (isPending && updatingWorkoutId === workout.id)}
            onSkip={handleSkipWorkout}
            onUnskip={handleUnskipWorkout}
            onView={handleOpenPreview}
            onLog={handleOpenLogging}
          />
        ))}
      </div>

      {/* Preview Modal - uses full workout data */}
      {workoutData && modalMode === 'preview' && (
        <WorkoutPreviewModal
          isOpen={true}
          onClose={handleCloseModal}
          onStartLogging={handleStartLoggingFromPreview}
          workoutName={workoutData.workout.name}
          dayNumber={workoutData.workout.dayNumber}
          exercises={workoutData.workout.exercises}
          completion={workoutData.workout.completions[0]}
        />
      )}

      {/* Logging Modal - uses progressive loading */}
      {workoutMetadata && modalMode === 'logging' && (
        <ExerciseLoggingModal
          key={modalKey}
          isOpen={true}
          onClose={handleCloseModal}
          workoutId={workoutMetadata.workout.id}
          workoutName={workoutMetadata.workout.name}
          exerciseCount={workoutMetadata.exerciseCount}
          workoutCompletionId={workoutMetadata.completionId}
          initialExercise={workoutMetadata.firstExercise}
          initialHistory={workoutMetadata.firstExerciseHistory}
          onComplete={handleCompleteWorkout}
          onRefresh={handleRefreshMetadata}
        />
      )}

      {/* Program Completion Modal */}
      <ProgramCompletionModal
        open={showCompletionModal}
        programId={programId}
        onClose={() => setShowCompletionModal(false)}
        onRestart={handleProgramRestart}
      />
    </div>
  )
}
