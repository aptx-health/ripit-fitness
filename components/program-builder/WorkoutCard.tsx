import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react'
import type { Exercise, Workout } from '@/types/program-builder'
import SortableExerciseList from '../SortableExerciseList'

type WorkoutCardProps = {
  workout: Workout
  isCollapsed: boolean
  isLoading: boolean
  editingWorkoutId: string | null
  editingWorkoutName: string
  deletingWorkoutId: string | null
  deletingExerciseId: string | null
  onToggleCollapse: (workoutId: string) => void
  onStartEdit: (workoutId: string, name: string) => void
  onCancelEdit: () => void
  onSaveName: (workoutId: string) => void
  onSetEditingName: (name: string) => void
  onDelete: (workoutId: string, name: string) => void
  onOpenDuplicateModal: (workout: { id: string; name: string }) => void
  onOpenSwapModal: (workout: { id: string; name: string }) => void
  onAddExercise: (workoutId: string) => void
  onEditExercise: (exercise: Exercise, workoutId: string) => void
  onDeleteExercise: (exerciseId: string, name: string) => void
  onReorderExercises: (workoutId: string, exercises: Exercise[]) => void
}

export default function WorkoutCard({
  workout,
  isCollapsed,
  isLoading,
  editingWorkoutId,
  editingWorkoutName,
  deletingWorkoutId,
  deletingExerciseId,
  onToggleCollapse,
  onStartEdit,
  onCancelEdit,
  onSaveName,
  onSetEditingName,
  onDelete,
  onOpenDuplicateModal,
  onOpenSwapModal,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onReorderExercises,
}: WorkoutCardProps) {
  return (
    <div className="bg-muted p-2 sm:p-3 doom-card relative !overflow-visible">
      <div className="flex items-center justify-between mb-2">
        {editingWorkoutId === workout.id ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editingWorkoutName}
              onChange={(e) => onSetEditingName(e.target.value)}
              className="px-2 py-1 border border-input rounded text-sm flex-1 bg-muted text-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveName(workout.id)
                } else if (e.key === 'Escape') {
                  onCancelEdit()
                }
              }}
            />
            <button type="button"
              onClick={() => onSaveName(workout.id)}
              disabled={isLoading}
              className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary-hover disabled:opacity-50"
            >
              Save
            </button>
            <button type="button"
              onClick={onCancelEdit}
              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary-hover"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <button type="button"
              onClick={() => onToggleCollapse(workout.id)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="font-medium text-foreground doom-heading">{workout.name}</span>
            <span className="text-sm text-muted-foreground">
              ({workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}, {workout.exercises.reduce((sum, ex) => sum + ex.prescribedSets.length, 0)} sets)
            </span>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button"
                  disabled={isLoading || deletingWorkoutId === workout.id}
                  className="p-1.5 sm:px-2 sm:py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors disabled:opacity-50 uppercase tracking-wide"
                >
                  <MoreVertical size={14} className="sm:hidden" />
                  <span className="hidden sm:inline">Options</span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="bg-card border border-border shadow-lg z-50 doom-corners overflow-hidden min-w-[150px]"
                  sideOffset={5}
                >
                  <DropdownMenu.Item
                    onClick={() => onStartEdit(workout.id, workout.name)}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer outline-none"
                  >
                    Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => onOpenDuplicateModal({ id: workout.id, name: workout.name })}
                    disabled={isLoading}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                  >
                    Duplicate
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => onOpenSwapModal({ id: workout.id, name: workout.name })}
                    disabled={isLoading}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                  >
                    Move to Week
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => onDelete(workout.id, workout.name)}
                    disabled={deletingWorkoutId === workout.id}
                    className="px-4 py-2.5 text-sm text-error hover:bg-error hover:text-error-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
                  >
                    {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete'}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {workout.exercises.length === 0 ? (
            <div className="text-muted-foreground text-xs mb-2">No exercises yet</div>
          ) : (
            <SortableExerciseList
              exercises={workout.exercises}
              workoutId={workout.id}
              onReorder={onReorderExercises}
              onEditExercise={(exercise) => onEditExercise(exercise, workout.id)}
              onDeleteExercise={onDeleteExercise}
              deletingExerciseId={deletingExerciseId}
              isLoading={isLoading}
            />
          )}
          <button type="button"
            onClick={() => onAddExercise(workout.id)}
            disabled={isLoading || deletingWorkoutId === workout.id}
            className="w-full py-1.5 bg-success/80 hover:bg-success text-success-foreground text-xs font-semibold uppercase tracking-wide disabled:opacity-50 transition-colors"
          >
            + Add Exercise
          </button>
        </>
      )}
    </div>
  )
}
