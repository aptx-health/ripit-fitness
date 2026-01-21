'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import ExerciseLoggingModal from './ExerciseLoggingModal'
import { useWorkoutStorage } from '@/hooks/useWorkoutStorage'

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string // Changed from number to support ranges like "8-12"
  weight: string | null
  rpe: number | null
  rir: number | null
}

type LoggedSet = {
  id: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  exerciseId: string
}

type Exercise = {
  id: string
  name: string
  order: number
  exerciseGroup: string | null
  notes: string | null
  prescribedSets: PrescribedSet[]
}

type WorkoutCompletion = {
  id: string
  completedAt: Date
  status: string // 'draft' | 'completed' | 'abandoned'
  loggedSets: LoggedSet[]
}

type Workout = {
  id: string
  name: string
  dayNumber: number
  week: {
    weekNumber: number
  }
  exercises: Exercise[]
  completions: WorkoutCompletion[]
}

type ExerciseHistorySet = {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

type ExerciseHistory = {
  completedAt: Date
  workoutName: string
  sets: ExerciseHistorySet[]
}

type Props = {
  workout: Workout
  programId: string
  exerciseHistory?: Record<string, ExerciseHistory | null> // NEW: Exercise history map
}

type LoggedSetInput = {
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

export default function WorkoutDetail({ workout, programId, exerciseHistory }: Props) {
  const router = useRouter()
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false)
  const { clearStoredWorkout } = useWorkoutStorage(workout.id)
  const completion = workout.completions[0]

  // Determine workout status
  const isDraft = completion?.status === 'draft'
  const isWorkoutCompleted = completion?.status === 'completed'

  const handleCompleteWorkout = async (loggedSets: LoggedSetInput[]) => {
    try {
      const response = await fetch(`/api/workouts/${workout.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loggedSets }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete workout')
      }

      // Refresh the page to show the completed workout
      router.refresh()
    } catch (error) {
      console.error('Error completing workout:', error)
      throw error
    }
  }

  const handleClearWorkout = useCallback(async () => {
    if (!completion) return

    if (
      !confirm(
        'Are you sure you want to clear this workout? All logged data will be deleted.'
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/workouts/${workout.id}/clear`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to clear workout')
      }

      // Clear localStorage to prevent stale data
      clearStoredWorkout()

      router.refresh()
    } catch (error) {
      console.error('Error clearing workout:', error)
      alert('Failed to clear workout. Please try again.')
    }
  }, [completion, workout.id, clearStoredWorkout, router])

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - Fixed at top */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href={`/programs/${programId}/weeks/${workout.week.weekNumber}`}
            className="text-primary hover:text-primary-hover font-medium inline-block mb-2"
          >
            ← Week {workout.week.weekNumber}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground font-medium">
                Day {workout.dayNumber}
              </div>
              <h1 className="text-2xl font-bold text-foreground">{workout.name}</h1>
            </div>
            {isWorkoutCompleted && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            {isDraft && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning">
                <Clock className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          {isWorkoutCompleted && completion && (
            <p className="text-sm text-success-text mt-1">
              Completed on {new Date(completion.completedAt).toLocaleDateString()}
            </p>
          )}
          {isDraft && completion && (
            <p className="text-sm text-warning-text mt-1">
              In progress - {completion.loggedSets.length} set{completion.loggedSets.length !== 1 ? 's' : ''} logged
            </p>
          )}
        </div>
      </div>

      {/* Exercises List */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {workout.exercises.map((exercise, index) => {
            // Get logged sets for this exercise from the completion
            const exerciseLoggedSets = (isWorkoutCompleted || isDraft) && completion
              ? completion.loggedSets.filter((ls) => ls.exerciseId === exercise.id)
              : []

            return (
              <div
                key={exercise.id}
                className="bg-card rounded-lg border border-border overflow-hidden"
              >
                {/* Exercise Header */}
                <div className="bg-muted px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    {exercise.exerciseGroup && (
                      <span className="px-2 py-0.5 bg-accent-muted text-accent-text text-xs font-bold rounded">
                        {exercise.exerciseGroup}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      {exercise.name}
                    </h3>
                  </div>
                  {exercise.notes && (
                    <p className="text-sm text-muted-foreground mt-1 ml-8">
                      {exercise.notes}
                    </p>
                  )}
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-foreground">
                          Set
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground">
                          Reps
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground">
                          Weight
                        </th>
                        {(exercise.prescribedSets.some((s) => s.rir !== null) ||
                          exerciseLoggedSets.some((s) => s.rir !== null)) && (
                          <th className="px-4 py-2 text-left font-semibold text-foreground">
                            RIR
                          </th>
                        )}
                        {(exercise.prescribedSets.some((s) => s.rpe !== null) ||
                          exerciseLoggedSets.some((s) => s.rpe !== null)) && (
                          <th className="px-4 py-2 text-left font-semibold text-foreground">
                            RPE
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(isWorkoutCompleted || isDraft) ? (
                        // Show logged sets
                        exerciseLoggedSets.map((loggedSet) => (
                          <tr key={loggedSet.id} className="hover:bg-muted">
                            <td className="px-4 py-3 font-medium text-foreground">
                              {loggedSet.setNumber}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {loggedSet.reps}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {loggedSet.weight}
                              {loggedSet.weightUnit}
                            </td>
                            {exerciseLoggedSets.some((s) => s.rir !== null) && (
                              <td className="px-4 py-3 text-foreground">
                                {loggedSet.rir ?? '-'}
                              </td>
                            )}
                            {exerciseLoggedSets.some((s) => s.rpe !== null) && (
                              <td className="px-4 py-3 text-foreground">
                                {loggedSet.rpe ?? '-'}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        // Show prescribed sets
                        exercise.prescribedSets.map((set) => (
                          <tr key={set.id} className="hover:bg-muted">
                            <td className="px-4 py-3 font-medium text-foreground">
                              {set.setNumber}
                            </td>
                            <td className="px-4 py-3 text-foreground">{set.reps}</td>
                            <td className="px-4 py-3 text-foreground">
                              {set.weight || '-'}
                            </td>
                            {exercise.prescribedSets.some((s) => s.rir !== null) && (
                              <td className="px-4 py-3 text-foreground">
                                {set.rir ?? '-'}
                              </td>
                            )}
                            {exercise.prescribedSets.some((s) => s.rpe !== null) && (
                              <td className="px-4 py-3 text-foreground">
                                {set.rpe ?? '-'}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Action Bar - Fixed at bottom for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {isWorkoutCompleted ? (
            <div className="space-y-2">
              <button
                onClick={handleClearWorkout}
                className="w-full py-4 bg-muted text-foreground rounded-lg font-semibold hover:bg-secondary-hover active:bg-secondary-active transition-colors"
              >
                Reset
              </button>
              <p className="text-xs text-center text-muted-foreground">
                This will delete your logged data for this workout
              </p>
            </div>
          ) : isDraft ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsLoggingModalOpen(true)}
                  className="py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm"
                >
                  Continue Logging
                </button>
                <button
                  onClick={handleClearWorkout}
                  className="py-4 bg-muted text-foreground rounded-lg font-semibold hover:bg-secondary-hover active:bg-secondary-active transition-colors"
                >
                  Reset
                </button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Reset will delete all logged data for this workout
              </p>
            </div>
          ) : (
            <button
              onClick={() => setIsLoggingModalOpen(true)}
              className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm"
            >
              Start Logging
            </button>
          )}
        </div>
      </div>

      {/* Logging Modal */}
      <ExerciseLoggingModal
        isOpen={isLoggingModalOpen}
        onClose={() => setIsLoggingModalOpen(false)}
        exercises={workout.exercises}
        workoutId={workout.id}
        workoutName={workout.name}
        onComplete={handleCompleteWorkout}
        exerciseHistory={exerciseHistory} // NEW: Pass exercise history
      />
    </div>
  )
}
