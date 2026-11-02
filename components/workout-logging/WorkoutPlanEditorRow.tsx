'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'
import { pluralize } from '@/lib/format/pluralize'
import ExerciseQuickActionsMenu, { type QuickAction } from './ExerciseQuickActionsMenu'
import type { WorkoutPlanEditorExercise } from './WorkoutPlanEditor'

type Props = {
  exercise: WorkoutPlanEditorExercise
  /** 1-based position in the plan. */
  number: number
  isCurrent: boolean
  /** Reorder mode: show the drag grip. */
  reorderMode: boolean
  onJump: () => void
  onSwap: () => void
  onDelete: () => void
}

type Status = 'done' | 'now' | 'upcoming'

/**
 * One plain row in the plan sheet: a status square (✓ done, a number, or a
 * filled number for now), the name (wrapping, normal case), a sub-line with
 * set squares and "2 of 4 sets · 50 lbs", the NOW chip on the current row, and
 * the row's ⋮ menu. The drag grip shows only in Reorder mode.
 */
export function WorkoutPlanEditorRow({ exercise, number, isCurrent, reorderMode, onJump, onSwap, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
    disabled: !reorderMode,
  })

  const { setsDone, setsPlanned, detail } = exercise
  const status: Status = isCurrent
    ? 'now'
    : typeof setsPlanned === 'number' && setsPlanned > 0 && setsDone >= setsPlanned
      ? 'done'
      : 'upcoming'

  const sets =
    typeof setsPlanned === 'number' ? `${setsDone} of ${pluralize(setsPlanned, 'set')}` : pluralize(setsDone, 'set')
  const subLine = detail ? `${sets} · ${detail}` : sets

  const menuActions: QuickAction[] = [
    { label: 'Swap exercise', icon: RefreshCw, onClick: onSwap },
    {
      label: 'Delete exercise',
      icon: Trash2,
      onClick: onDelete,
      variant: 'danger',
      requiresConfirmation: true,
      confirmationTitle: `Delete ${exercise.name}?`,
      confirmationMessage: 'It will be removed from this workout.',
    },
  ]

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      data-status={status}
      data-current={isCurrent || undefined}
      className={`relative flex items-center gap-3 py-2.5 pl-3 pr-1 select-none ${
        // The one current cue: an inset bar on the left and a light wash.
        isCurrent ? 'bg-primary/10 shadow-[inset_4px_0_0_var(--primary)]' : 'bg-card'
      } ${isDragging ? 'shadow-xl ring-2 ring-secondary' : ''}`}
    >
      {reorderMode && (
        <button
          type="button"
          aria-label={`Drag to reorder ${exercise.name}`}
          {...attributes}
          {...listeners}
          className="-ml-2 flex h-12 w-12 flex-shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing doom-focus-ring"
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={20} strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}

      <StatusSquare status={status} number={number} />

      <button type="button" onClick={onJump} className="min-w-0 flex-1 py-1 text-left doom-focus-ring">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold text-foreground break-words">{exercise.name}</span>
          {isCurrent && (
            <span className="bg-primary px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-primary-foreground">
              Now
            </span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {typeof setsPlanned === 'number' && setsPlanned > 0 && (
            <span aria-hidden="true" className="flex gap-1">
              {Array.from({ length: setsPlanned }, (_, i) => (
                <span
                  key={i}
                  data-set-square={i < setsDone ? 'done' : 'todo'}
                  className={`h-2.5 w-2.5 ${i < setsDone ? 'bg-primary' : 'border-2 border-border'}`}
                />
              ))}
            </span>
          )}
          <span>{subLine}</span>
        </span>
      </button>

      <ExerciseQuickActionsMenu
        actions={menuActions}
        triggerIcon={MoreVertical}
        triggerAriaLabel={`Edit options for ${exercise.name}`}
        heading={exercise.name}
        triggerClassName="h-12 w-12 flex-shrink-0 text-muted-foreground hover:text-foreground"
      />
    </li>
  )
}

/** ✓ when done, the filled number for now, an outlined number otherwise. */
function StatusSquare({ status, number }: { status: Status; number: number }) {
  const base = 'flex h-9 w-9 flex-shrink-0 items-center justify-center text-sm font-bold'
  if (status === 'done') {
    return (
      <span role="img" aria-label="Done" className={`${base} bg-primary text-primary-foreground`}>
        <Check size={18} strokeWidth={3} aria-hidden="true" />
      </span>
    )
  }
  return (
    <span className={`${base} ${status === 'now' ? 'bg-primary text-primary-foreground' : 'border-2 border-border text-foreground'}`}>
      {number}
    </span>
  )
}
