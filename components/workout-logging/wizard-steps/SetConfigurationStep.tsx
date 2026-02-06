'use client'

import { SetConfigurationInterface, ExercisePrescription } from '@/components/exercise-selection/SetConfigurationInterface'
import type { ExerciseDefinition } from './ExerciseSearchStep'

// Re-export ExercisePrescription for other components that import it from here
export type { ExercisePrescription }

interface SetConfigurationStepProps {
  exercise: ExerciseDefinition
  initialConfig?: {
    setCount: number
    intensityType: 'RIR' | 'RPE' | 'NONE'
    notes: string
    sets: Array<{
      id?: string
      setNumber: number
      reps: string
      intensityValue?: number
    }>
  }
  onConfigChange: (config: ExercisePrescription) => void
  onDuplicateSet?: (setId: string) => Promise<void>
  isSystemExercise?: boolean
  onEditExercise?: () => void
}

export function SetConfigurationStep({
  exercise,
  initialConfig,
  onConfigChange,
  onDuplicateSet,
  isSystemExercise,
  onEditExercise,
}: SetConfigurationStepProps) {
  return (
    <div className="flex flex-col h-full w-full">
      <SetConfigurationInterface
        exercise={exercise}
        initialConfig={initialConfig}
        onConfigChange={onConfigChange}
        showDuplicateButton={!!onDuplicateSet}
        onDuplicateSet={onDuplicateSet}
        isSystemExercise={isSystemExercise}
        onEditExercise={onEditExercise}
      />
    </div>
  )
}
