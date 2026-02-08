'use client'

import { ExerciseSearchInterface, ExerciseDefinition } from '@/components/exercise-selection/ExerciseSearchInterface'

// Re-export ExerciseDefinition for other components that import it from here
export type { ExerciseDefinition }

interface ExerciseSearchStepProps {
  onSelect: (exercise: ExerciseDefinition) => void
}

export function ExerciseSearchStep({ onSelect }: ExerciseSearchStepProps) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <ExerciseSearchInterface
        onExerciseSelect={onSelect}
        preloadExercises={true}
      />
    </div>
  )
}
