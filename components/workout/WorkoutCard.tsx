'use client'

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

type Props = {
  workout: Workout
  isSkipping: boolean
  isLoading: boolean
  isUnskipping: boolean
  onSkip: (workoutId: string) => void
  onUnskip: (workoutId: string) => void
  onView: (workoutId: string) => void
  onLog: (workoutId: string) => void
}

export default function WorkoutCard({
  workout,
  isSkipping,
  isLoading,
  isUnskipping,
  onSkip,
  onUnskip,
  onView,
  onLog,
}: Props) {
  const latestCompletion = workout.completions[0]
  const isCompleted = latestCompletion?.status === 'completed'
  const isDraft = latestCompletion?.status === 'draft'
  const isSkipped = latestCompletion?.status === 'skipped'

  return (
    <div
      className={`border p-4 transition ${
        isCompleted
          ? 'border-success-border bg-success-muted/50 doom-workout-completed'
          : isDraft
            ? 'border-warning-border bg-warning-muted/50'
            : isSkipped
              ? 'border-muted-foreground/50 bg-muted/50'
              : 'border-border bg-muted'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-foreground doom-heading">
              DAY {workout.dayNumber}: {workout.name}
            </h3>
            {isCompleted && (
              <span className="doom-badge doom-badge-completed">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {isDraft && (
              <span className="doom-badge doom-badge-accent">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                IN PROGRESS
              </span>
            )}
            {isSkipped && (
              <span className="doom-badge bg-muted-foreground/30 text-foreground/70">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
                SKIPPED
              </span>
            )}
          </div>

          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground doom-label">
                EXERCISES
              </span>
              <p className="text-foreground doom-stat">{workout._count.exercises}</p>
            </div>
          </div>

          {latestCompletion && (
            <p className="text-xs text-muted-foreground mt-2">
              Last logged: {new Date(latestCompletion.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {/* Primary action button */}
          {isSkipped ? (
            <button
              onClick={() => onUnskip(workout.id)}
              disabled={isUnskipping}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm disabled:opacity-50"
            >
              {isUnskipping ? 'RESTORING...' : 'UNSKIP'}
            </button>
          ) : (
            <button
              onClick={() => isCompleted ? onView(workout.id) : onLog(workout.id)}
              disabled={isLoading}
              className={`px-4 py-2 ${
                isDraft
                  ? 'bg-accent text-accent-foreground hover:bg-accent-hover doom-button-3d-accent'
                  : 'bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d'
              } doom-focus-ring font-semibold uppercase tracking-wider text-sm disabled:opacity-50`}
            >
              {isCompleted ? 'REVIEW' : isDraft ? 'CONTINUE' : 'LOG WORKOUT'}
            </button>
          )}

          {/* Secondary buttons row */}
          {!isCompleted && (
            <div className="flex items-center gap-2">
              {/* View button - show for non-completed workouts */}
              <button
                onClick={() => onView(workout.id)}
                disabled={isLoading}
                className="px-3 py-2 border-2 border-border text-foreground bg-transparent hover:bg-muted hover:border-primary active:bg-muted/80 doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'LOADING...' : 'VIEW'}
              </button>

              {/* Skip button - only show if no completion status */}
              {!latestCompletion && (
                <button
                  onClick={() => onSkip(workout.id)}
                  disabled={isSkipping}
                  className="px-3 py-2 border-2 border-border text-foreground bg-transparent hover:bg-muted hover:border-primary active:bg-muted/80 doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
                >
                  {isSkipping ? 'SKIPPING...' : 'SKIP'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
