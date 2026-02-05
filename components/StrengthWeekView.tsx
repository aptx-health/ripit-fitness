'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import WeekNavigator from '@/components/ui/WeekNavigator'
import ActionsMenu from '@/components/ActionsMenu'
import WorkoutPreviewModal from '@/components/WorkoutPreviewModal'
import ExerciseLoggingModal from '@/components/ExerciseLoggingModal'
import { ProgramCompletionModal } from '@/components/ProgramCompletionModal'
import { useWorkoutStorage } from '@/hooks/useWorkoutStorage'
import WorkoutCard from '@/components/workout/WorkoutCard'

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

export default function StrengthWeekView({
  programId,
  programName,
  week,
  totalWeeks
}: Props) {
  const router = useRouter()
  const [skippingWorkout, setSkippingWorkout] = useState<string | null>(null)
  const [unskippingWorkout, setUnskippingWorkout] = useState<string | null>(null)
  const [completingWeek, setCompletingWeek] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [workoutData, setWorkoutData] = useState<FetchedWorkoutData | null>(null)
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
      console.error('Error checking program completion:', error)
    }
  }, [programId, isRestarting])

  // Check program completion status on mount
  useEffect(() => {
    checkProgramCompletion(false)
  }, [checkProgramCompletion])

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
      console.error('Error fetching workout:', error)
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

  const handleOpenLogging = async (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    const data = await fetchWorkoutData(workoutId, true)
    if (data) setModalMode('logging')
  }

  const handleCloseModal = () => {
    setModalMode(null)
    setSelectedWorkoutId(null)
    setWorkoutData(null)
    router.refresh()
  }

  const handleStartLoggingFromPreview = async () => {
    if (!selectedWorkoutId) return
    // Fetch with history for logging modal
    const data = await fetchWorkoutData(selectedWorkoutId, true)
    if (data) setModalMode('logging')
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
    handleCloseModal()
    await checkProgramCompletion(true)
  }

  const handleClearWorkout = async () => {
    if (!selectedWorkoutId) return
    const response = await fetch(`/api/workouts/${selectedWorkoutId}/clear`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to clear workout')
    clearStoredWorkout()
    setModalKey(prev => prev + 1)
    // Refetch the workout data
    const data = await fetchWorkoutData(selectedWorkoutId, modalMode === 'logging')
    setWorkoutData(data)
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
            isLoading={isLoadingWorkout && selectedWorkoutId === workout.id}
            onSkip={handleSkipWorkout}
            onUnskip={handleUnskipWorkout}
            onView={handleOpenPreview}
            onLog={handleOpenLogging}
          />
        ))}
      </div>

      {/* Preview Modal */}
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

      {/* Logging Modal */}
      {workoutData && modalMode === 'logging' && (
        <ExerciseLoggingModal
          key={modalKey}
          isOpen={true}
          onClose={handleCloseModal}
          exercises={workoutData.workout.exercises}
          workoutId={workoutData.workout.id}
          workoutName={workoutData.workout.name}
          workoutCompletionId={workoutData.workout.completions[0]?.id}
          onComplete={handleCompleteWorkout}
          onRefresh={() => fetchWorkoutData(selectedWorkoutId!, true).then(setWorkoutData)}
          exerciseHistory={workoutData.exerciseHistory as Record<string, { completedAt: Date; workoutName: string; sets: Array<{ setNumber: number; reps: number; weight: number; weightUnit: string; rpe: number | null; rir: number | null }> } | null>}
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
