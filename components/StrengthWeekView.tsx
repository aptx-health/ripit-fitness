'use client'

import { CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import ExerciseLoggingModal from '@/components/ExerciseLoggingModal'
import { BeginnerPrimerWizard } from '@/components/features/training/BeginnerPrimerWizard'
import { PostSessionFeedback } from '@/components/features/training/PostSessionFeedback'
import { StickNudgeBanner } from '@/components/features/training/StickNudgeBanner'
import { WarmupInterstitial } from '@/components/features/training/WarmupInterstitial'
import { ProgramCompletionModal } from '@/components/ProgramCompletionModal'
import { useTour } from '@/components/tour'
import WeekNavigator from '@/components/ui/WeekNavigator'
import WorkoutHistoryList from '@/components/WorkoutHistoryList'
import WorkoutCard from '@/components/workout/WorkoutCard'
import { useUserSettings } from '@/hooks/useUserSettings'
import { clientLogger } from '@/lib/client-logger'
import { useDraftWorkout } from '@/lib/contexts/DraftWorkoutContext'
import { TRAINING_PAGE_STEPS, TRAINING_PAGE_TOUR_ID } from '@/lib/tour/steps/training-page'
import { shouldShowPrimer } from '@/lib/training/primer'
import { POST_SESSION_COOLDOWN } from '@/types/feedback'

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
  description: string | null
  workouts: Workout[]
}

type Props = {
  programId: string
  programName: string
  week: Week
  totalWeeks: number
  historyCount: number
}

type ModalMode = 'logging' | null

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
  resumeExerciseIndex?: number
}

export default function StrengthWeekView({
  programId,
  programName,
  week,
  totalWeeks,
  historyCount,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeDraft, refreshDraft, clearDraft } = useDraftWorkout()
  const { settings, isLoading: settingsLoading, refetch: refetchSettings, updateSettings } = useUserSettings()
  const [isPending, startTransition] = useTransition()
  const [updatingWorkoutId, setUpdatingWorkoutId] = useState<string | null>(null)
  const [skippingWorkout, setSkippingWorkout] = useState<string | null>(null)
  const [unskippingWorkout, setUnskippingWorkout] = useState<string | null>(null)
  const [completingWeek, setCompletingWeek] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [workoutMetadata, setWorkoutMetadata] = useState<WorkoutMetadata | null>(null)
  // Auto-expand first workout when arriving from onboarding (?expand=first)
  const shouldExpandFirst = searchParams.get('expand') === 'first'
  const firstWorkoutId = week.workouts.length > 0 ? week.workouts[0].id : null
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(
    shouldExpandFirst && firstWorkoutId ? firstWorkoutId : null
  )
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false)
  const [modalKey, setModalKey] = useState(0)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isProgramComplete, setIsProgramComplete] = useState(false)
  const [showPostSession, setShowPostSession] = useState(false)
  const [pendingProgramCompletionCheck, setPendingProgramCompletionCheck] = useState(false)

  const resumeWorkoutId = searchParams.get('resume')

  // Contextual content triggers
  // Primer gating lives in lib/training/primer.ts with its own unit tests to
  // guard against accidental removal during tutorial reworks (see issue #485).
  const showPrimer = shouldShowPrimer({
    historyCount,
    dismissedPrimer: settings?.dismissedPrimer ?? false,
    settingsLoading,
  })
  const showWarmup = historyCount < 4 && !settings?.dismissedWarmup
  const showStickNudge = historyCount >= 3 && historyCount <= 8 && !settings?.dismissedStickNudge && !settingsLoading

  // Training page guided tour
  const { startTour: startPageTour, isActive: tourActive } = useTour()
  useEffect(() => {
    if (settingsLoading || !settings || tourActive) return
    try {
      const completed: string[] = JSON.parse(settings.completedTours || '[]')
      if (!completed.includes(TRAINING_PAGE_TOUR_ID)) {
        const timer = setTimeout(() => {
          startPageTour(TRAINING_PAGE_TOUR_ID, TRAINING_PAGE_STEPS)
        }, 300)
        return () => clearTimeout(timer)
      }
    } catch { /* invalid JSON, skip */ }
  }, [settingsLoading, settings, tourActive, startPageTour])

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

  // Safety timeout: clear loading state if transition stalls (e.g. router.refresh() hangs)
  useEffect(() => {
    if (!updatingWorkoutId) return
    const timeout = setTimeout(() => {
      setUpdatingWorkoutId(null)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [updatingWorkoutId])

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

  // Toggle expanded workout row (only one at a time)
  const handleToggleWorkout = useCallback((workoutId: string) => {
    setExpandedWorkoutId(prev => prev === workoutId ? null : workoutId)
  }, [])

  // Interception state — primer and warm-up gate before logging modal
  const [primerOpen, setPrimerOpen] = useState(false)
  const [warmupOpen, setWarmupOpen] = useState(false)
  const [pendingLoggingWorkoutId, setPendingLoggingWorkoutId] = useState<string | null>(null)

  // Core logging flow — fetches metadata and opens the logging modal
  const proceedToLogging = useCallback(async (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    setExpandedWorkoutId(null)
    const metadata = await fetchWorkoutMetadata(workoutId)
    if (!metadata) return

    // Safety check: If workout is already completed, do not open logging
    if (metadata.completionStatus === 'completed') {
      clientLogger.info('Workout already completed, skipping logging')
      return
    }

    setModalMode('logging')
  }, [fetchWorkoutMetadata])

  // After primer completes, check if warm-up is also needed before proceeding
  const proceedAfterPrimer = () => {
    setPrimerOpen(false)
    if (showWarmup && pendingLoggingWorkoutId) {
      setWarmupOpen(true)
    } else if (pendingLoggingWorkoutId) {
      proceedToLogging(pendingLoggingWorkoutId)
      setPendingLoggingWorkoutId(null)
    }
  }

  // Opens logging modal with progressive loading (fast!)
  // Intercepts with primer (first ever) then warm-up (sessions 1-3)
  const handleOpenLogging = useCallback(async (workoutId: string) => {
    // Prevent opening a different workout while a draft exists
    if (activeDraft && activeDraft.workoutId !== workoutId) {
      alert(
        `You have an in-progress workout ("${activeDraft.workoutName}"). Resume or discard it first.`
      )
      return
    }

    // Skip primer/warmup interception when resuming an existing draft —
    // the user already started this workout and saw these screens
    const isResumingDraft = activeDraft && activeDraft.workoutId === workoutId

    // Primer interception — first ever workout
    if (showPrimer && !primerOpen && !isResumingDraft) {
      setPendingLoggingWorkoutId(workoutId)
      setPrimerOpen(true)
      return
    }

    // Warm-up interception for early sessions
    if (showWarmup && !warmupOpen && !isResumingDraft) {
      setPendingLoggingWorkoutId(workoutId)
      setWarmupOpen(true)
      return
    }

    await proceedToLogging(workoutId)
  }, [activeDraft, showPrimer, primerOpen, showWarmup, warmupOpen, proceedToLogging])

  const handleWarmupCancel = () => {
    setWarmupOpen(false)
    setPendingLoggingWorkoutId(null)
  }

  const handleWarmupContinue = () => {
    setWarmupOpen(false)
    if (pendingLoggingWorkoutId) {
      proceedToLogging(pendingLoggingWorkoutId)
      setPendingLoggingWorkoutId(null)
    }
  }

  const handleWarmupDismissPermanently = () => {
    setWarmupOpen(false)
    refetchSettings()
    if (pendingLoggingWorkoutId) {
      proceedToLogging(pendingLoggingWorkoutId)
      setPendingLoggingWorkoutId(null)
    }
  }

  // Auto-resume draft workout when navigated with ?resume= param
  useEffect(() => {
    if (resumeWorkoutId && !modalMode) {
      // Clear the param from URL without triggering a navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('resume')
      window.history.replaceState(null, '', url.toString())

      handleOpenLogging(resumeWorkoutId)
    }
  }, [resumeWorkoutId, handleOpenLogging, modalMode])

  const handleCloseModal = (workoutUpdated = false) => {
    const workoutId = selectedWorkoutId
    setModalMode(null)
    setSelectedWorkoutId(null)
    setWorkoutMetadata(null)

    // Optimistically clear draft context so UI unblocks immediately,
    // then refresh from server for authoritative state
    clearDraft()
    refreshDraft()

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

  // Completion is handled inside ExerciseLoggingModal now (per-set writes + status flip)
  const handleCompleteWorkout = async () => {
    handleCloseModal(true)

    // Check if we should show the post-session feedback prompt
    const shouldPrompt = settings
      && (settings.postSessionPromptCount % POST_SESSION_COOLDOWN === 0)
    if (shouldPrompt) {
      setShowPostSession(true)
      setPendingProgramCompletionCheck(true)
      // Bump the prompt counter immediately so skip/send both count
      updateSettings({
        postSessionPromptCount: (settings.postSessionPromptCount ?? 0) + 1,
        lastPostSessionPromptAt: new Date().toISOString(),
      }).then(() => refetchSettings()).catch(() => {})
    } else {
      // Increment counter even when not showing to keep cadence
      if (settings) {
        updateSettings({
          postSessionPromptCount: (settings.postSessionPromptCount ?? 0) + 1,
        }).then(() => refetchSettings()).catch(() => {})
      }
      await checkProgramCompletion(true)
    }
  }

  const handlePostSessionClose = async () => {
    setShowPostSession(false)
    if (pendingProgramCompletionCheck) {
      setPendingProgramCompletionCheck(false)
      await checkProgramCompletion(true)
    }
  }

  const _handleClearWorkout = async () => {
    if (!selectedWorkoutId) return
    const response = await fetch(`/api/workouts/${selectedWorkoutId}/clear`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to clear workout')
    setModalKey(prev => prev + 1)
    // Refetch the workout metadata
    if (modalMode === 'logging') {
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

  return (
    <div className="space-y-4">
      <div>
        <WeekNavigator
          currentWeek={week.weekNumber}
          totalWeeks={totalWeeks}
          baseUrl="/training"
          programName={programName}
          completionIndicator={
            isProgramComplete ? (
              <button type="button"
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
        {week.description && (
          <div className="mt-3 px-1">
            <p className="text-base text-muted-foreground leading-relaxed">
              {week.description}
            </p>
          </div>
        )}
      </div>

      {showStickNudge && (
        <div className="mb-4">
          <StickNudgeBanner onDismiss={refetchSettings} />
        </div>
      )}

      <div className="bg-card border border-border doom-corners divide-y divide-border">
        {week.workouts.map(workout => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            expanded={expandedWorkoutId === workout.id}
            isSkipping={skippingWorkout === workout.id}
            isUnskipping={unskippingWorkout === workout.id}
            isLoading={(isLoadingWorkout && selectedWorkoutId === workout.id) || (isPending && updatingWorkoutId === workout.id)}
            onToggle={handleToggleWorkout}
            onSkip={handleSkipWorkout}
            onUnskip={handleUnskipWorkout}
            onLog={handleOpenLogging}
          />
        ))}

        {hasIncompleteWorkouts && (
          <button
            type="button"
            data-training-widget
            onClick={() => {
              if (confirm('This will mark all remaining workouts as skipped. Are you sure?')) {
                handleCompleteWeek()
              }
            }}
            disabled={completingWeek}
            className="w-full py-3.5 text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 active:bg-muted/60 transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring disabled:opacity-50"
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              {completingWeek ? 'COMPLETING...' : 'COMPLETE WEEK'}
            </div>
          </button>
        )}
      </div>

      {/* Recent History */}
      {historyCount > 0 && (
        <WorkoutHistoryList count={historyCount} compact />
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
          initialExerciseIndex={workoutMetadata.resumeExerciseIndex ?? 0}
          onComplete={handleCompleteWorkout}
          onRefresh={handleRefreshMetadata}
        />
      )}

      {/* Beginner Primer — shown on first-ever Log tap, before warm-up */}
      <BeginnerPrimerWizard
        open={primerOpen}
        onDismiss={() => {
          refetchSettings()
          proceedAfterPrimer()
        }}
      />

      {/* Warm-up Interstitial — shown between Log tap and logging modal */}
      <WarmupInterstitial
        open={warmupOpen}
        onContinue={handleWarmupContinue}
        onCancel={handleWarmupCancel}
        onDismissPermanently={handleWarmupDismissPermanently}
      />

      {/* Post-Session Feedback */}
      <PostSessionFeedback
        open={showPostSession}
        onClose={handlePostSessionClose}
      />

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
