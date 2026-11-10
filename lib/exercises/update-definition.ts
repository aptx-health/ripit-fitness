import type { Prisma, PrismaClient } from '@prisma/client'

export const adminExerciseDefinitionSelect = {
  id: true,
  name: true,
  normalizedName: true,
  equipment: true,
  primaryFAUs: true,
  secondaryFAUs: true,
  category: true,
  aliases: true,
  instructions: true,
  notes: true,
  imageUrls: true,
  isSystem: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExerciseDefinitionSelect

/**
 * Updates a definition (admin edit, applies for every user). When the name
 * changes, every Exercise row (any user) still carrying the old name gets the
 * new one in the same transaction; rows renamed on purpose keep their name.
 */
export async function updateExerciseDefinition(
  prisma: PrismaClient,
  { id, oldName, data }: { id: string; oldName: string; data: Prisma.ExerciseDefinitionUpdateInput }
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.exerciseDefinition.update({
      where: { id },
      data,
      select: adminExerciseDefinitionSelect,
    })

    let renamedExercises = 0
    if (updated.name !== oldName) {
      const result = await tx.exercise.updateMany({
        where: { exerciseDefinitionId: id, name: oldName },
        data: { name: updated.name },
      })
      renamedExercises = result.count
    }

    return { updated, renamedExercises }
  })
}
