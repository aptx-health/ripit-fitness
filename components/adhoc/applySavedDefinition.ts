import type { SavedDefinition } from '@/components/features/exercise-definition/QuickEditExerciseSheet'
import type { AdHocExercise } from './AdHocLoggerView'

/**
 * Shows a saved definition in place: same exercise, same logged sets and inputs.
 * Renames only exercises still on the old name, as the server does.
 */
export function applySavedDefinition(
  exercises: AdHocExercise[],
  definition: SavedDefinition,
  previousName: string
): AdHocExercise[] {
  return exercises.map((ex) =>
    ex.exerciseDefinition.id === definition.id
      ? {
          ...ex,
          name: ex.name === previousName ? definition.name : ex.name,
          exerciseDefinition: {
            ...ex.exerciseDefinition,
            primaryFAUs: definition.primaryFAUs,
            secondaryFAUs: definition.secondaryFAUs,
            equipment: definition.equipment,
            instructions: definition.instructions ?? undefined,
            imageUrls: definition.imageUrls ?? ex.exerciseDefinition.imageUrls,
          },
        }
      : ex
  )
}
