'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/radix/dialog'

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string
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
  status: string
  completedAt: Date
  loggedSets: LoggedSet[]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onStartLogging: () => void
  workoutName: string
  dayNumber: number
  exercises: Exercise[]
  completion?: WorkoutCompletion | null
}

export default function WorkoutPreviewModal({
  isOpen,
  onClose,
  onStartLogging,
  workoutName,
  dayNumber,
  exercises,
  completion,
}: Props) {
  const isDraft = completion?.status === 'draft'
  const isCompleted = completion?.status === 'completed'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[100dvh] sm:max-h-[85vh] h-[100dvh] sm:h-[85vh]"
        showClose={true}
        fullScreenMobile={true}
      >
        <DialogHeader>
          <DialogDescription className="text-sm sm:text-base font-semibold uppercase tracking-wider">
            Day {dayNumber}
          </DialogDescription>
          <DialogTitle className="text-xl sm:text-2xl font-bold uppercase tracking-wide doom-title">
            {workoutName}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {exercises.map((exercise, index) => {
            const exerciseLoggedSets = completion?.loggedSets.filter(
              (ls) => ls.exerciseId === exercise.id
            ) || []

            const showLoggedSets = (isCompleted || isDraft) && exerciseLoggedSets.length > 0

            return (
              <div
                key={exercise.id}
                className="bg-muted border-2 border-border overflow-hidden doom-corners"
              >
                <div className="bg-card px-4 py-3 border-b-2 border-border">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </span>
                    {exercise.exerciseGroup && (
                      <span className="px-2 py-1 bg-accent-muted text-accent-text text-xs font-bold uppercase tracking-wider border border-accent">
                        {exercise.exerciseGroup}
                      </span>
                    )}
                    <h3 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wide doom-heading">
                      {exercise.name}
                    </h3>
                  </div>
                  {exercise.notes && (
                    <p className="text-sm text-muted-foreground mt-2 ml-10">
                      {exercise.notes}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm sm:text-base">
                    <thead className="bg-card border-b-2 border-border">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-foreground uppercase tracking-wider text-xs sm:text-sm">
                          Set
                        </th>
                        <th className="px-4 py-2 text-left font-bold text-foreground uppercase tracking-wider text-xs sm:text-sm">
                          Reps
                        </th>
                        <th className="px-4 py-2 text-left font-bold text-foreground uppercase tracking-wider text-xs sm:text-sm">
                          Weight
                        </th>
                        {(exercise.prescribedSets.some((s) => s.rir !== null) ||
                          exerciseLoggedSets.some((s) => s.rir !== null)) && (
                          <th className="px-4 py-2 text-left font-bold text-foreground uppercase tracking-wider text-xs sm:text-sm">
                            RIR
                          </th>
                        )}
                        {(exercise.prescribedSets.some((s) => s.rpe !== null) ||
                          exerciseLoggedSets.some((s) => s.rpe !== null)) && (
                          <th className="px-4 py-2 text-left font-bold text-foreground uppercase tracking-wider text-xs sm:text-sm">
                            RPE
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-border">
                      {showLoggedSets
                        ? exerciseLoggedSets.map((loggedSet) => (
                            <tr key={loggedSet.id} className="hover:bg-card">
                              <td className="px-4 py-3 font-bold text-foreground">
                                {loggedSet.setNumber}
                              </td>
                              <td className="px-4 py-3 text-foreground font-medium">
                                {loggedSet.reps}
                              </td>
                              <td className="px-4 py-3 text-foreground font-medium">
                                {loggedSet.weight}{loggedSet.weightUnit}
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
                        : exercise.prescribedSets.map((set) => (
                            <tr key={set.id} className="hover:bg-card">
                              <td className="px-4 py-3 font-bold text-foreground">
                                {set.setNumber}
                              </td>
                              <td className="px-4 py-3 text-foreground font-medium">
                                {set.reps}
                              </td>
                              <td className="px-4 py-3 text-foreground font-medium">
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
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </DialogBody>

        <DialogFooter className="gap-3 border-t-2">
          <button
            onClick={onClose}
            className="px-5 py-3 border-2 border-border text-foreground hover:bg-muted doom-focus-ring font-bold uppercase tracking-wider text-sm sm:text-base"
          >
            Close
          </button>
          {!isCompleted && (
            <button
              onClick={onStartLogging}
              className="px-5 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-bold uppercase tracking-wider text-sm sm:text-base"
            >
              {isDraft ? 'Continue Logging' : 'Start Logging'}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
