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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { WorkoutPlanEditorRow } from './WorkoutPlanEditorRow'

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

  // Close on Escape, but defer to any nested popper (Radix DropdownMenu
  // calls preventDefault on its own Escape handling) — checking
  // defaultPrevented keeps the gear menu's Escape from closing the editor.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
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
      className="fixed inset-0 z-[90] flex justify-start sm:items-center sm:justify-center"
      style={{ position: 'fixed', inset: 0 }}
    >
      {/* Backdrop as a real button so a11y rules are satisfied and screen
          readers see an explicit dismissal target. The sheet sits above it. */}
      <button
        type="button"
        aria-label="Close workout plan editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md cursor-default focus:outline-none"
        tabIndex={-1}
      />
      <div
        className="relative bg-muted flex flex-col w-[88vw] max-w-[420px] mt-[env(safe-area-inset-top)] h-[calc(100dvh-env(safe-area-inset-top))] border-r-2 border-border shadow-[8px_0_24px_rgba(0,0,0,0.25)] animate-in slide-in-from-left duration-200
                   sm:w-full sm:max-w-2xl sm:h-[85vh] sm:max-h-[85vh] sm:mt-0 sm:border-2 sm:shadow-xl sm:slide-in-from-bottom"
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
                  <WorkoutPlanEditorRow
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
          <AddExerciseButton onClick={onAdd} block />
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <p className="text-foreground text-lg font-bold uppercase tracking-wider mb-2">
        No exercises yet
      </p>
      <p className="text-muted-foreground text-sm mb-6 max-w-[280px]">
        Add an exercise to get started. Changes apply to today&apos;s session only.
      </p>
      <AddExerciseButton onClick={onAdd} />
    </div>
  )
}

/** Primary "+ Add exercise" CTA. `block` stretches to fill its row (footer). */
function AddExerciseButton({ onClick, block = false }: { onClick: () => void; block?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-base flex items-center gap-2 doom-focus-ring transition-colors hover:bg-primary-hover active:translate-y-[2px] ${
        block ? 'w-full justify-center' : 'px-6'
      }`}
      style={{
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 3px 0 var(--primary-active, #047857)',
      }}
    >
      <Plus size={20} strokeWidth={2.5} />
      Add exercise
    </button>
  )
}
