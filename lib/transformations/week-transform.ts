import { PrismaClient, Prisma } from '@prisma/client'

type WeekWithWorkouts = Prisma.WeekGetPayload<{
  include: {
    program: true
    workouts: {
      include: {
        exercises: {
          include: {
            prescribedSets: true
          }
        }
      }
    }
  }
}>

/**
 * Apply intensity adjustment to all prescribed sets in a week
 * - RPE: Adjusts within 1-10 range (higher = easier)
 * - RIR: Adjusts within 0-10 range with INVERSE direction (higher adjustment = harder workout = lower RIR)
 */
export async function applyIntensityAdjustment(
  tx: Prisma.TransactionClient,
  week: WeekWithWorkouts,
  adjustment: number
): Promise<number> {
  // Flatten all prescribed sets from the week
  const allSets = week.workouts.flatMap(workout =>
    workout.exercises.flatMap(exercise => exercise.prescribedSets)
  )

  // Separate RPE and RIR sets
  const rpeSets = allSets.filter(set => set.rpe !== null)
  const rirSets = allSets.filter(set => set.rir !== null)

  let updatedCount = 0

  // Update RPE sets with clamping to 1-10
  if (rpeSets.length > 0) {
    await tx.$executeRaw`
      UPDATE "PrescribedSet"
      SET rpe = CASE
        WHEN rpe + ${adjustment} < 1 THEN 1
        WHEN rpe + ${adjustment} > 10 THEN 10
        ELSE rpe + ${adjustment}
      END
      WHERE id IN (${Prisma.join(rpeSets.map(s => s.id))})
    `
    updatedCount += rpeSets.length
  }

  // Update RIR sets with INVERSE adjustment and clamping to 0-10
  if (rirSets.length > 0) {
    const invertedAdjustment = -adjustment
    await tx.$executeRaw`
      UPDATE "PrescribedSet"
      SET rir = CASE
        WHEN rir + ${invertedAdjustment} < 0 THEN 0
        WHEN rir + ${invertedAdjustment} > 10 THEN 10
        ELSE rir + ${invertedAdjustment}
      END
      WHERE id IN (${Prisma.join(rirSets.map(s => s.id))})
    `
    updatedCount += rirSets.length
  }

  return updatedCount
}

/**
 * Apply volume adjustment to all exercises in a week
 * - Addition (+1): Clone the first set (easiest) and renumber
 * - Removal (-1): Remove from beginning (preserve harder sets at end), skip single-set exercises
 */
export async function applyVolumeAdjustment(
  tx: Prisma.TransactionClient,
  week: WeekWithWorkouts,
  adjustment: number,
  userId: string
): Promise<{ addedCount: number; removedCount: number; skippedCount: number }> {
  const allExercises = week.workouts.flatMap(workout => workout.exercises)

  let addedCount = 0
  let removedCount = 0
  let skippedCount = 0

  if (adjustment > 0) {
    // Add sets by cloning the first set
    for (const exercise of allExercises) {
      // Fetch fresh data from database (in case intensity was adjusted first)
      const currentSets = await tx.prescribedSet.findMany({
        where: { exerciseId: exercise.id },
        orderBy: { setNumber: 'asc' }
      })

      if (currentSets.length === 0) continue

      const firstSet = currentSets[0]

      // Clone the first set (adjustment) times
      const newSets = []
      for (let i = 0; i < adjustment; i++) {
        const newSet = await tx.prescribedSet.create({
          data: {
            exerciseId: exercise.id,
            setNumber: 999 + i, // Temporary number
            reps: firstSet.reps,
            weight: firstSet.weight,
            rpe: firstSet.rpe,
            rir: firstSet.rir,
            userId
          }
        })
        newSets.push(newSet)
        addedCount++
      }

      // Build desired order: [firstSet, ...newSets, ...rest of currentSets]
      const desiredOrder = [
        currentSets[0],
        ...newSets,
        ...currentSets.slice(1)
      ]

      // Renumber in desired order
      for (let i = 0; i < desiredOrder.length; i++) {
        await tx.prescribedSet.update({
          where: { id: desiredOrder[i].id },
          data: { setNumber: i + 1 }
        })
      }
    }
  } else if (adjustment < 0) {
    // Remove sets from beginning (preserve harder sets at end)
    const removalCount = Math.abs(adjustment)

    for (const exercise of allExercises) {
      // Fetch fresh data from database (in case intensity was adjusted first)
      const sets = await tx.prescribedSet.findMany({
        where: { exerciseId: exercise.id },
        orderBy: { setNumber: 'asc' }
      })

      // Skip exercises with only 1 set
      if (sets.length <= 1) {
        skippedCount++
        continue
      }

      // Calculate how many sets to actually remove (don't go below 1)
      const actualRemoval = Math.min(removalCount, sets.length - 1)

      // Delete first N sets
      const setsToDelete = sets.slice(0, actualRemoval)
      await tx.prescribedSet.deleteMany({
        where: {
          id: { in: setsToDelete.map(s => s.id) }
        }
      })
      removedCount += actualRemoval

      // Renumber remaining sets
      const remainingSets = await tx.prescribedSet.findMany({
        where: { exerciseId: exercise.id },
        orderBy: { setNumber: 'asc' }
      })

      for (let i = 0; i < remainingSets.length; i++) {
        await tx.prescribedSet.update({
          where: { id: remainingSets[i].id },
          data: { setNumber: i + 1 }
        })
      }
    }
  }

  return { addedCount, removedCount, skippedCount }
}
