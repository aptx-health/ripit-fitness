'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'
import type { Exercise, Week } from '@/types/program-builder'
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
  editingWeekNameId: string | null
  editingWeekName: string
  editingWeekDescription: string
  onDuplicateWeek: (weekId: string) => void
  onDeleteWeek: (weekId: string, weekNumber: number) => void
  onOpenTransformModal: (weekId: string, weekNumber: number) => void
  onStartWeekNameEdit: (weekId: string, name?: string | null, description?: string | null) => void
  onCancelWeekNameEdit: () => void
  onSaveWeekName: (weekId: string) => void
  onSetEditingWeekName: (name: string) => void
  onSetEditingWeekDescription: (description: string) => void
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
  editingWeekNameId,
  editingWeekName,
  editingWeekDescription,
  onDuplicateWeek,
  onDeleteWeek,
  onOpenTransformModal,
  onStartWeekNameEdit,
  onCancelWeekNameEdit,
  onSaveWeekName,
  onSetEditingWeekName,
  onSetEditingWeekDescription,
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
  const isEditingThisWeek = editingWeekNameId === week.id
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  return (
    <div className="border border-border p-2 sm:p-4 doom-noise doom-corners !overflow-visible">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isEditingThisWeek ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground doom-heading whitespace-nowrap">
                  WEEK {week.weekNumber}
                </span>
                <input
                  type="text"
                  value={editingWeekName}
                  onChange={(e) => onSetEditingWeekName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveWeekName(week.id)
                    if (e.key === 'Escape') onCancelWeekNameEdit()
                  }}
                  maxLength={100}
                  placeholder="Week name (e.g. Deload)"
                  className="px-2 py-1 text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <textarea
                value={editingWeekDescription}
                onChange={(e) => onSetEditingWeekDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelWeekNameEdit()
                }}
                maxLength={400}
                rows={2}
                placeholder="Description (optional)"
                className="px-2 py-1 text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              />
              {editingWeekDescription.length > 0 && (
                <span className="text-xs text-muted-foreground">{editingWeekDescription.length}/400</span>
              )}
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => onSaveWeekName(week.id)}
                  className="px-2 py-0.5 text-xs bg-success text-success-foreground hover:bg-success-hover font-semibold uppercase"
                >
                  Save
                </button>
                <button type="button"
                  onClick={onCancelWeekNameEdit}
                  className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h3 className="font-medium text-foreground doom-heading">
              {week.name || `WEEK ${week.weekNumber}`}
            </h3>
          )}

          {!isEditingThisWeek && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button"
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
                    onClick={() => onStartWeekNameEdit(week.id, week.name, week.description)}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer outline-none"
                  >
                    Rename Week
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => onDuplicateWeek(week.id)}
                    disabled={duplicatingWeekId === week.id}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer outline-none border-t border-border"
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
          )}
        </div>

        <button type="button"
          onClick={() => onAddWorkout(week.id)}
          disabled={isLoading}
          className="px-3 py-1 bg-primary text-primary-foreground text-sm hover:bg-primary-hover disabled:opacity-50 doom-button-3d font-semibold uppercase"
        >
          ADD WORKOUT
        </button>
      </div>

      {!isEditingThisWeek && week.description && (
        <div className="mb-3">
          <p className={`text-sm text-muted-foreground ${!descriptionExpanded ? 'line-clamp-2 sm:line-clamp-3' : ''}`}>
            {week.description}
          </p>
          {week.description.length > 120 && (
            <button type="button"
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              className="text-xs text-muted-foreground/70 hover:text-foreground mt-0.5 transition-colors"
            >
              {descriptionExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

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
