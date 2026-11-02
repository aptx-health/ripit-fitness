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
import { ArrowDownUp, ListChecks, Plus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import { pluralize } from '@/lib/format/pluralize'
import { lockAppScroll } from '@/lib/nav/app-scroll'
import { WorkoutPlanEditorRow } from './WorkoutPlanEditorRow'

export type WorkoutPlanEditorExercise = {
  id: string
  name: string
  /** Sets logged for this exercise so far. */
  setsDone: number
  /** Prescribed sets; omitted for a freestyle exercise. */
  setsPlanned?: number
  /** The sub-line's tail, e.g. "50 lbs". */
  detail?: string
}

type WorkoutPlanEditorProps = {
  open: boolean
  onClose: () => void
  exercises: WorkoutPlanEditorExercise[]
  currentExerciseId?: string | null
  isReordering?: boolean
  /** The workout clock, e.g. "24:10", for the summary line. */
  elapsed?: string
  onReorder: (orderedIds: string[]) => Promise<void> | void
  onJump: (exerciseId: string) => void
  onAdd: () => void
  onSwap: (exerciseId: string) => void
  onDelete: (exerciseId: string) => void
}

/** The workout clock for the summary, "mm:ss" (or "h:mm:ss"), from the start to `now`. */
export function elapsedSince(startedAt: string | null | undefined, now: number): string {
  const started = startedAt ? Date.parse(startedAt) : Number.NaN
  const total = Number.isNaN(started) ? 0 : Math.max(0, Math.floor((now - started) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`
}

/** "9 of 23 sets · 24:10"; all freestyle: "12 sets · 24:10". */
function summaryLine(exercises: WorkoutPlanEditorExercise[], elapsed?: string) {
  const done = exercises.reduce((n, e) => n + e.setsDone, 0)
  const planned = exercises.every((e) => typeof e.setsPlanned === 'number')
    ? exercises.reduce((n, e) => n + (e.setsPlanned ?? 0), 0)
    : null
  const sets = planned === null ? pluralize(done, 'set') : `${done} of ${pluralize(planned, 'set')}`
  return elapsed ? `${sets} · ${elapsed}` : sets
}

/**
 * The workout plan as a folder bottom sheet (plan-drawer A): a "Workout plan"
 * paper tab with the position chip ("2/6") and a close box, a one-line
 * summary, plain rows in one box (done / now / upcoming), and a footer with a
 * Reorder mode (drag grips only while it is on) and "+ Add exercise".
 */
export default function WorkoutPlanEditor({
  open,
  onClose,
  exercises,
  currentExerciseId,
  isReordering = false,
  elapsed,
  onReorder,
  onJump,
  onAdd,
  onSwap,
  onDelete,
}: WorkoutPlanEditorProps) {
  // Optimistic local order so drags feel instant; reconciles when `exercises` prop changes.
  const [localOrder, setLocalOrder] = useState<WorkoutPlanEditorExercise[]>(exercises)
  const [seenExercises, setSeenExercises] = useState(exercises)
  if (exercises !== seenExercises) {
    setSeenExercises(exercises)
    setLocalOrder(exercises)
  }
  // Drag grips only in Reorder mode, so a scroll or a tap never starts a drag by accident.
  const [reorderMode, setReorderMode] = useState(false)
  const titleId = useId()

  // Close on Escape, but defer to any nested popper (Radix DropdownMenu
  // calls preventDefault on its own Escape handling) — checking
  // defaultPrevented keeps the row menu's Escape from closing the sheet.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock app scroll while open
  useEffect(() => {
    if (!open) return
    return lockAppScroll()
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

  const position = localOrder.findIndex((e) => e.id === currentExerciseId) + 1

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" style={{ position: 'fixed', inset: 0 }}>
      {/* Backdrop as a real button so a tap outside closes the sheet. */}
      <button
        type="button"
        aria-label="Dismiss workout plan"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default focus:outline-none"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-2 mb-[max(env(safe-area-inset-bottom),8px)] flex max-h-[85dvh] w-full max-w-lg flex-col animate-in slide-in-from-bottom duration-200"
      >
        {/* A folder like Quick actions: a paper tab and the close button on a clear row above the box. */}
        <div className="flex flex-shrink-0 items-end">
          <PaperTabTitle
            tone="mine"
            icon={<ListChecks size={16} />}
            count={position > 0 ? `${position}/${localOrder.length}` : undefined}
            countLabel={position > 0 ? `exercise ${position} of ${localOrder.length}` : undefined}
            asChild
          >
            <h2 id={titleId}>Workout plan</h2>
          </PaperTabTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="folder-box ml-auto flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-b-0 border-secondary bg-card text-foreground hover:bg-muted doom-focus-ring"
          >
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="folder-box flex min-h-0 flex-1 flex-col border-2 border-secondary bg-card shadow-xl">

        {localOrder.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          <>
            <p className="flex-shrink-0 border-b border-border px-4 py-2 text-sm text-muted-foreground">
              {summaryLine(localOrder, elapsed)}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border" aria-busy={isReordering || undefined}>
                    {localOrder.map((exercise, index) => (
                      <WorkoutPlanEditorRow
                        key={exercise.id}
                        exercise={exercise}
                        number={index + 1}
                        isCurrent={exercise.id === currentExerciseId}
                        reorderMode={reorderMode}
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
            </div>
            <div className="flex flex-shrink-0 gap-2 border-t border-border px-3 py-3">
              <button
                type="button"
                aria-pressed={reorderMode}
                onClick={() => setReorderMode((on) => !on)}
                className={`flex h-12 flex-1 items-center justify-center gap-2 border-2 text-sm font-bold uppercase tracking-wider doom-focus-ring ${
                  reorderMode ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <ArrowDownUp size={16} aria-hidden="true" />
                Reorder
              </button>
              <AddExerciseButton onClick={onAdd} block />
            </div>
          </>
        )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="mb-2 text-lg font-bold uppercase tracking-wider text-foreground">No exercises yet</p>
      <p className="mb-6 max-w-[280px] text-sm text-muted-foreground">
        Add an exercise to get started. Changes apply to today&apos;s session only.
      </p>
      <AddExerciseButton onClick={onAdd} />
    </div>
  )
}

/** Primary "+ Add exercise". `block` lets it share the footer row with Reorder. */
function AddExerciseButton({ onClick, block = false }: { onClick: () => void; block?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[0_3px_0_var(--primary-active)] hover:bg-primary-hover doom-focus-ring ${
        block ? 'flex-1' : 'px-6'
      }`}
    >
      <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
      Add exercise
    </button>
  )
}
