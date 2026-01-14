'use client'

import Link from 'next/link'

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

type Program = {
  id: string
  name: string
  weeks: { weekNumber: number }[]
}

type Props = {
  program: Program
  week: Week
}

export default function StrengthCurrentWeek({ program, week }: Props) {
  const totalWeeks = program.weeks.length

  return (
    <div className="bg-card border border-border doom-noise doom-card p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground doom-heading">
            THIS WEEK
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {program.name} - Week {week.weekNumber} of {totalWeeks}
          </p>
        </div>
        <Link
          href={`/programs/${program.id}/weeks/${week.weekNumber}`}
          className="text-sm text-primary hover:underline doom-focus-ring"
        >
          VIEW FULL WEEK →
        </Link>
      </div>

      <div className="space-y-3">
        {week.workouts.map((workout) => {
          const latestCompletion = workout.completions[0]
          const isCompleted = latestCompletion && latestCompletion.status === 'completed'
          const isDraft = latestCompletion && latestCompletion.status === 'draft'

          return (
            <div
              key={workout.id}
              className={`border p-4 transition ${
                isCompleted
                  ? 'border-success-border bg-success-muted/50 doom-workout-completed'
                  : isDraft
                  ? 'border-warning-border bg-warning-muted/50'
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
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        COMPLETED
                      </span>
                    )}
                    {isDraft && (
                      <span className="doom-badge doom-badge-warning">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        IN PROGRESS
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground doom-label">EXERCISES</span>
                      <p className="text-foreground doom-stat">{workout._count.exercises}</p>
                    </div>
                  </div>

                  {latestCompletion && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last logged: {new Date(latestCompletion.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <Link
                  href={`/programs/${program.id}/workouts/${workout.id}`}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
                >
                  {isCompleted ? 'LOG AGAIN' : isDraft ? 'CONTINUE' : 'LOG WORKOUT'}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
