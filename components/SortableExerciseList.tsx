'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import SortableExerciseItem from './SortableExerciseItem'

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

type SortableExerciseListProps = {
  exercises: Exercise[]
  workoutId: string
  onReorder: (workoutId: string, reorderedExercises: Exercise[]) => void
  onEditExercise: (exercise: Exercise) => void
  onDeleteExercise: (exerciseId: string, exerciseName: string) => void
  deletingExerciseId: string | null
  isLoading: boolean
}

export default function SortableExerciseList({
  exercises,
  workoutId,
  onReorder,
  onEditExercise,
  onDeleteExercise,
  deletingExerciseId,
  isLoading,
}: SortableExerciseListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex((e) => e.id === active.id)
      const newIndex = exercises.findIndex((e) => e.id === over.id)

      const reorderedExercises = arrayMove(exercises, oldIndex, newIndex).map(
        (exercise, index) => ({
          ...exercise,
          order: index,
        })
      )

      onReorder(workoutId, reorderedExercises)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={exercises.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 mb-2">
          {exercises.map((exercise) => (
            <SortableExerciseItem
              key={exercise.id}
              exercise={exercise}
              onEdit={() => onEditExercise(exercise)}
              onDelete={() => onDeleteExercise(exercise.id, exercise.name)}
              isDeleting={deletingExerciseId === exercise.id}
              isLoading={isLoading}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
