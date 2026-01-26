'use client'

import ActionsMenu, { type ActionItem } from '../ActionsMenu'
import { Plus, RefreshCw, Pencil, Trash2, LogOut } from 'lucide-react'

interface ExerciseActionsFooterProps {
  currentExerciseName: string
  nextSetNumber: number
  totalLoggedSets: number
  totalPrescribedSets: number
  canLogSet: boolean
  hasLoggedAllPrescribed: boolean
  isSubmitting: boolean
  onLogSet: () => void
  onCompleteWorkout: () => void
  onAddExercise: () => void
  onEditExercise: () => void
  onReplaceExercise: () => void
  onDeleteExercise: () => void
  onExitWorkout: () => void
}

export default function ExerciseActionsFooter({
  currentExerciseName,
  nextSetNumber,
  totalLoggedSets,
  totalPrescribedSets,
  canLogSet,
  hasLoggedAllPrescribed,
  isSubmitting,
  onLogSet,
  onCompleteWorkout,
  onAddExercise,
  onEditExercise,
  onReplaceExercise,
  onDeleteExercise,
  onExitWorkout,
}: ExerciseActionsFooterProps) {
  const actions: ActionItem[] = [
    {
      label: 'Edit this exercise',
      icon: Pencil,
      onClick: onEditExercise,
      disabled: false
    },
    {
      label: 'Add an exercise',
      icon: Plus,
      onClick: onAddExercise,
      disabled: false
    },
    {
      label: 'Swap this exercise',
      icon: RefreshCw,
      onClick: onReplaceExercise,
      disabled: false
    },
    {
      label: 'Delete this exercise',
      icon: Trash2,
      onClick: onDeleteExercise,
      disabled: false,
      variant: 'danger' as const,
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to delete "${currentExerciseName}"?`
    },
    {
      label: 'Exit workout',
      icon: LogOut,
      onClick: onExitWorkout,
      disabled: false,
      variant: 'danger' as const,
      requiresConfirmation: false
    }
  ]

  return (
    <div className="border-t border-border px-4 py-3 bg-muted flex-shrink-0 sm:rounded-b-2xl">
      <div className="grid grid-cols-[53%_34%_10%] sm:grid-cols-[55%_35%_10%] gap-3">
        {/* Log Set Button */}
        <button
          onClick={onLogSet}
          disabled={!canLogSet || hasLoggedAllPrescribed}
          className="py-3 bg-accent text-accent-foreground font-semibold rounded-xl transition-all hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Log Set {nextSetNumber}
        </button>

        {/* Complete Workout Button */}
        <button
          disabled={isSubmitting || totalLoggedSets === 0}
          className="py-3 bg-success text-success-foreground font-semibold rounded-xl transition-all hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
          onMouseDown={(e) => {
            if (isSubmitting || totalLoggedSets === 0) return;
            e.preventDefault();
            onCompleteWorkout();
          }}
        >
          {isSubmitting ? (
            'Saving...'
          ) : (
            <div className="flex flex-col items-center justify-center leading-tight">
              <span className="text-sm">Complete</span>
              <span className="text-xs opacity-80">{totalLoggedSets}/{totalPrescribedSets}</span>
            </div>
          )}
        </button>

        {/* Actions Menu */}
        <ActionsMenu
          variant="accent"
          size="md"
          className="h-full aspect-square"
          actions={actions}
        />
      </div>
    </div>
  )
}
