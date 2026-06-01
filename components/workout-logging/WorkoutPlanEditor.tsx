'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, GripVertical, Plus, RefreshCw, Settings, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ExerciseQuickActionsMenu, { type QuickAction } from './ExerciseQuickActionsMenu'

export type WorkoutPlanEditorExercise = {
  id: string
  name: string
}

type WorkoutPlanEditorProps = {
  open: boolean
  onClose: () => void
  exercises: WorkoutPlanEditorExercise[]
  currentExerciseId?: string | null
  isReordering?: boolean
  onReorder: (orderedIds: string[]) => Promise<void> | void
  onJump: (exerciseId: string) => void
  onAdd: () => void
  onSwap: (exerciseId: string) => void
  onDelete: (exerciseId: string) => void
}

export default function WorkoutPlanEditor({
  open,
  onClose,
  exercises,
  currentExerciseId,
  isReordering = false,
  onReorder,
  onJump,
  onAdd,
  onSwap,
  onDelete,
}: WorkoutPlanEditorProps) {
  // Optimistic local order so drags feel instant; reconciles when `exercises` prop changes.
  const [localOrder, setLocalOrder] = useState<WorkoutPlanEditorExercise[]>(exercises)

  useEffect(() => {
    setLocalOrder(exercises)
  }, [exercises])

  // Close on Escape, but defer to any nested popper (Radix DropdownMenu calls
  // preventDefault on Escape when it dismisses its own content). Without this
  // guard, opening the gear menu and pressing Escape closes the editor too.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const sensors = useSensors(
    // Pointer activates after 5px to avoid eating taps.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Touch activates after a 180ms press, so list scroll still wins by default.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = useMemo(() => localOrder.map((e) => e.id), [localOrder])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.findIndex((e) => e.id === active.id)
    const newIndex = localOrder.findIndex((e) => e.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(localOrder, oldIndex, newIndex)
    setLocalOrder(next)
    void onReorder(next.map((e) => e.id))
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workout plan editor"
      className="fixed inset-0 z-[90] flex justify-start bg-black/40 backdrop-blur-md sm:items-center sm:justify-center"
      style={{ position: 'fixed', inset: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-muted flex flex-col w-[88vw] max-w-[420px] h-[100dvh] border-r-2 border-border shadow-[8px_0_24px_rgba(0,0,0,0.25)] animate-in slide-in-from-left duration-200
                   sm:w-full sm:max-w-2xl sm:h-[85vh] sm:max-h-[85vh] sm:border-2 sm:shadow-xl sm:slide-in-from-bottom"
      >
      <EditorHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {localOrder.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2.5" aria-busy={isReordering || undefined}>
                {localOrder.map((exercise) => (
                  <SortableRow
                    key={exercise.id}
                    exercise={exercise}
                    isCurrent={exercise.id === currentExerciseId}
                    onJump={() => {
                      onJump(exercise.id)
                      onClose()
                    }}
                    onSwap={() => onSwap(exercise.id)}
                    onDelete={() => onDelete(exercise.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {localOrder.length > 0 && (
        <div
          className="flex-shrink-0 bg-muted border-t-2 border-border px-3 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <button
            type="button"
            onClick={onAdd}
            className="w-full h-12 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-base flex items-center justify-center gap-2 doom-focus-ring transition-colors hover:bg-primary-hover active:translate-y-[2px]"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 3px 0 var(--primary-active, #047857)',
            }}
          >
            <Plus size={20} strokeWidth={2.5} />
            Add exercise
          </button>
        </div>
      )}
      </div>
    </div>,
    document.body,
  )
}

function EditorHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="bg-secondary text-secondary-foreground flex-shrink-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)',
      }}
    >
      <div className="px-3 py-2.5 grid items-center gap-3" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="min-w-0">
          <div className="text-lg font-bold uppercase tracking-widest leading-tight">
            Workout plan
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground/70 leading-tight mt-0.5">
            Drag to reorder · tap name to jump
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close workout plan editor"
          className="h-9 w-9 flex items-center justify-center text-secondary-foreground/80 hover:text-secondary-foreground transition-colors doom-focus-ring"
          style={{
            backgroundColor: 'rgba(0,0,0,0.30)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

type SortableRowProps = {
  exercise: WorkoutPlanEditorExercise
  isCurrent: boolean
  onJump: () => void
  onSwap: () => void
  onDelete: () => void
}

function SortableRow({ exercise, isCurrent, onJump, onSwap, onDelete }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  const menuActions: QuickAction[] = [
    {
      label: 'Swap exercise',
      icon: RefreshCw,
      onClick: onSwap,
    },
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
        isCurrent ? 'doom-corners' : ''
      } ${
        isDragging
          ? 'border-2 border-primary bg-card shadow-[0_10px_24px_rgba(0,0,0,0.30)] scale-[1.01]'
          : isCurrent
            ? 'border-2 border-border'
            : 'border-2 border-border bg-card'
      }`}
      data-current={isCurrent || undefined}
    >
      {isCurrent && (
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
      )}
      <div
        className="relative flex items-stretch min-h-[52px]"
        style={{
          boxShadow: isDragging ? undefined : '0 2px 0 rgba(58, 40, 23, 0.18)',
        }}
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
            boxShadow: 'inset -1px 0 0 rgba(58, 40, 23, 0.12), inset 0 1px 1px rgba(58, 40, 23, 0.06)',
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <p className="text-foreground text-lg font-bold uppercase tracking-wider mb-2">
        No exercises yet
      </p>
      <p className="text-muted-foreground text-sm mb-6 max-w-[280px]">
        Add an exercise to get started. Changes apply to today&apos;s session only.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="h-12 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-base flex items-center gap-2 doom-focus-ring transition-colors hover:bg-primary-hover active:translate-y-[2px]"
        style={{
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 3px 0 var(--primary-active, #047857)',
        }}
      >
        <Plus size={20} strokeWidth={2.5} />
        Add exercise
      </button>
    </div>
  )
}
