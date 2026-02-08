'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string
  weight?: string | null
  rpe?: number | null
  rir?: number | null
}

type Exercise = {
  id: string
  name: string
  order: number
  notes?: string | null
  prescribedSets: PrescribedSet[]
  exerciseDefinition: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
  }
}

type SortableExerciseItemProps = {
  exercise: Exercise
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isLoading: boolean
}

export default function SortableExerciseItem({
  exercise,
  onEdit,
  onDelete,
  isDeleting,
  isLoading,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between bg-muted p-2 ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1">
          <span className="font-medium text-foreground">{exercise.name}</span>
          <span className="text-muted-foreground ml-2">
            ({exercise.prescribedSets.length} set{exercise.prescribedSets.length !== 1 ? 's' : ''})
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          disabled={isLoading || isDeleting}
          className="p-2 sm:px-3 sm:py-1.5 bg-secondary text-secondary-foreground text-sm hover:bg-secondary-hover disabled:opacity-50 font-semibold uppercase"
        >
          <Pencil size={16} className="sm:hidden" />
          <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 sm:px-3 sm:py-1.5 bg-error text-error-foreground text-sm hover:bg-error-hover disabled:opacity-50 font-semibold uppercase"
        >
          <Trash2 size={16} className="sm:hidden" />
          <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
        </button>
      </div>
    </div>
  )
}
