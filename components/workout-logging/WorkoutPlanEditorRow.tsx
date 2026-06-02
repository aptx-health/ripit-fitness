'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, GripVertical, RefreshCw, Settings, Trash2 } from 'lucide-react'
import ExerciseQuickActionsMenu, { type QuickAction } from './ExerciseQuickActionsMenu'
import type { WorkoutPlanEditorExercise } from './WorkoutPlanEditor'

type Props = {
  exercise: WorkoutPlanEditorExercise
  isCurrent: boolean
  onJump: () => void
  onSwap: () => void
  onDelete: () => void
}

/**
 * A draggable, jumpable, gear-menu row inside the WorkoutPlanEditor list.
 *
 * Lives in its own file to keep the editor shell readable — the row owns
 * dnd-kit wiring, the layered "current row" cues (brackets + brown stripe
 * + mint wash), and the inline gear menu. Nothing here is exported beyond
 * this component.
 */
export function WorkoutPlanEditorRow({
  exercise,
  isCurrent,
  onJump,
  onSwap,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  const menuActions: QuickAction[] = [
    { label: 'Swap exercise', icon: RefreshCw, onClick: onSwap },
    {
      label: 'Delete exercise',
      icon: Trash2,
      onClick: onDelete,
      variant: 'danger',
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to delete "${exercise.name}"?`,
    },
  ]

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative select-none transition-shadow ${
        isCurrent ? 'doom-corners border-2 border-border' : 'border-2 border-border bg-card'
      } ${
        isDragging
          ? 'border-primary bg-card shadow-[0_10px_24px_rgba(0,0,0,0.30)] scale-[1.01]'
          : ''
      }`}
      data-current={isCurrent || undefined}
    >
      {isCurrent && <CurrentRowCues />}
      <div
        className="relative flex items-stretch min-h-[52px]"
        style={{ boxShadow: isDragging ? undefined : '0 2px 0 rgba(58, 40, 23, 0.18)' }}
      >
        <button
          type="button"
          aria-label={`Drag to reorder ${exercise.name}`}
          {...attributes}
          {...listeners}
          className="relative flex-shrink-0 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors doom-focus-ring touch-none cursor-grab active:cursor-grabbing"
          style={{
            touchAction: 'none',
            backgroundColor: 'rgba(58, 40, 23, 0.04)',
            boxShadow:
              'inset -1px 0 0 rgba(58, 40, 23, 0.12), inset 0 1px 1px rgba(58, 40, 23, 0.06)',
          }}
        >
          <GripVertical size={20} strokeWidth={2.25} />
        </button>

        <button
          type="button"
          onClick={onJump}
          className="flex-1 min-w-0 flex items-center py-2.5 pl-3 pr-2 text-left doom-focus-ring"
        >
          <span className="min-w-0 inline-flex items-baseline gap-1.5 max-w-full">
            <span className="truncate text-base font-bold uppercase tracking-wider text-foreground">
              {exercise.name}
            </span>
            <ChevronRight
              size={16}
              strokeWidth={2.5}
              className="flex-shrink-0 text-muted-foreground/70 self-center"
            />
          </span>
        </button>

        <div className="flex-shrink-0 flex items-center pr-1">
          <ExerciseQuickActionsMenu
            actions={menuActions}
            triggerIcon={Settings}
            triggerAriaLabel={`Edit options for ${exercise.name}`}
            heading={exercise.name.toUpperCase()}
            triggerClassName="h-11 w-11 text-muted-foreground hover:text-foreground"
          />
        </div>
      </div>
    </li>
  )
}

/**
 * The three coordinated cues that mark a row as the active exercise: mint
 * wash overlay + the documented `border-l-4` brown stripe + (via the
 * parent's `doom-corners` class) the L-bracket frame.
 */
function CurrentRowCues() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)' }}
      />
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[6px] bg-secondary"
        style={{ marginLeft: '-2px' }}
      />
    </>
  )
}
