'use client'

import { LogOut, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import ActionsMenu, { type ActionItem } from '../ActionsMenu'

interface ExerciseActionsFooterProps {
  currentExerciseName: string
  nextSetNumber: number
  totalLoggedSets: number
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
    <div className="border-t border-border px-3 py-2 bg-card flex-shrink-0">
      <div className="flex items-center gap-2">
        {/* Log Set Button */}
        <button type="button"
          onClick={onLogSet}
          disabled={!canLogSet || hasLoggedAllPrescribed}
          className="flex-1 py-2.5 bg-accent text-accent-foreground text-sm font-bold uppercase tracking-wider transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed doom-button-3d doom-focus-ring"
        >
          LOG SET {nextSetNumber}
        </button>

        {/* Complete Workout Button */}
        <button type="button"
          disabled={isSubmitting || totalLoggedSets === 0}
          className="py-2.5 px-4 border border-success text-success text-sm font-bold uppercase tracking-wider transition-all hover:bg-success hover:text-success-foreground disabled:opacity-30 disabled:cursor-not-allowed doom-button-3d doom-focus-ring"
          onMouseDown={(e) => {
            if (isSubmitting || totalLoggedSets === 0) return;
            e.preventDefault();
            onCompleteWorkout();
          }}
        >
          {isSubmitting ? 'SAVING...' : 'COMPLETE'}
        </button>

        {/* Actions Menu */}
        <ActionsMenu
          variant="default"
          size="md"
          className="self-stretch w-10"
          actions={actions}
        />
      </div>
    </div>
  )
}
