import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Week, Exercise } from '@/types/program-builder'
import WorkoutCard from './WorkoutCard'

type WeekCardProps = {
  week: Week
  isLoading: boolean
  deletingWeekId: string | null
  duplicatingWeekId: string | null
  collapsedWorkouts: Set<string>
  editingWorkoutId: string | null
  editingWorkoutName: string
  deletingWorkoutId: string | null
  deletingExerciseId: string | null
  onDuplicateWeek: (weekId: string) => void
  onDeleteWeek: (weekId: string, weekNumber: number) => void
  onOpenTransformModal: (weekId: string, weekNumber: number) => void
  onAddWorkout: (weekId: string) => void
  onToggleCollapse: (workoutId: string) => void
  onStartWorkoutEdit: (workoutId: string, name: string) => void
  onCancelWorkoutEdit: () => void
  onSaveWorkoutName: (workoutId: string) => void
  onSetEditingWorkoutName: (name: string) => void
  onDeleteWorkout: (workoutId: string, name: string) => void
  onOpenDuplicateModal: (workout: { id: string; name: string }) => void
  onOpenSwapModal: (workout: { id: string; name: string }) => void
  onAddExercise: (workoutId: string) => void
  onEditExercise: (exercise: Exercise, workoutId: string) => void
  onDeleteExercise: (exerciseId: string, name: string) => void
  onReorderExercises: (workoutId: string, exercises: Exercise[]) => void
}

export default function WeekCard({
  week,
  isLoading,
  deletingWeekId,
  duplicatingWeekId,
  collapsedWorkouts,
  editingWorkoutId,
  editingWorkoutName,
  deletingWorkoutId,
  deletingExerciseId,
  onDuplicateWeek,
  onDeleteWeek,
  onOpenTransformModal,
  onAddWorkout,
  onToggleCollapse,
  onStartWorkoutEdit,
  onCancelWorkoutEdit,
  onSaveWorkoutName,
  onSetEditingWorkoutName,
  onDeleteWorkout,
  onOpenDuplicateModal,
  onOpenSwapModal,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onReorderExercises,
}: WeekCardProps) {
  return (
    <div className="border border-border p-2 sm:p-4 doom-noise doom-corners !overflow-visible">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground doom-heading">WEEK {week.weekNumber}</h3>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                disabled={isLoading || deletingWeekId === week.id || duplicatingWeekId === week.id}
                className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors disabled:opacity-50 uppercase tracking-wide"
              >
                {duplicatingWeekId === week.id ? 'Duplicating...' : 'Options'}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="bg-card border border-border shadow-lg z-50 doom-corners overflow-hidden min-w-[200px]"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={() => onDuplicateWeek(week.id)}
                  disabled={duplicatingWeekId === week.id}
                  className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none"
                >
                  {duplicatingWeekId === week.id ? 'Duplicating...' : 'Duplicate Week'}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onOpenTransformModal(week.id, week.weekNumber)}
                  className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                >
                  Transform Week
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onDeleteWeek(week.id, week.weekNumber)}
                  disabled={deletingWeekId === week.id}
                  className="px-4 py-2.5 text-sm text-error hover:bg-error hover:text-error-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                >
                  {deletingWeekId === week.id ? 'Deleting...' : 'Delete Week'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <button
          onClick={() => onAddWorkout(week.id)}
          disabled={isLoading}
          className="px-3 py-1 bg-primary text-primary-foreground text-sm hover:bg-primary-hover disabled:opacity-50 doom-button-3d font-semibold uppercase"
        >
          ADD WORKOUT
        </button>
      </div>

      {week.workouts.length === 0 ? (
        <div className="text-muted-foreground text-sm py-2">No workouts yet</div>
      ) : (
        <div className="space-y-2 overflow-visible">
          {week.workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              isCollapsed={collapsedWorkouts.has(workout.id)}
              isLoading={isLoading}
              editingWorkoutId={editingWorkoutId}
              editingWorkoutName={editingWorkoutName}
              deletingWorkoutId={deletingWorkoutId}
              deletingExerciseId={deletingExerciseId}
              onToggleCollapse={onToggleCollapse}
              onStartEdit={onStartWorkoutEdit}
              onCancelEdit={onCancelWorkoutEdit}
              onSaveName={onSaveWorkoutName}
              onSetEditingName={onSetEditingWorkoutName}
              onDelete={onDeleteWorkout}
              onOpenDuplicateModal={onOpenDuplicateModal}
              onOpenSwapModal={onOpenSwapModal}
              onAddExercise={onAddExercise}
              onEditExercise={onEditExercise}
              onDeleteExercise={onDeleteExercise}
              onReorderExercises={onReorderExercises}
            />
          ))}
        </div>
      )}
    </div>
  )
}
