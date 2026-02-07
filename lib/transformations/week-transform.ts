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
  const exerciseIds = allExercises.map(e => e.id)

  let addedCount = 0
  let removedCount = 0
  let skippedCount = 0

  if (exerciseIds.length === 0) {
    return { addedCount, removedCount, skippedCount }
  }

  // Pre-fetch all prescribed sets for all exercises in one query
  const allSets = await tx.prescribedSet.findMany({
    where: { exerciseId: { in: exerciseIds } },
    orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }]
  })

  // Group sets by exercise ID
  const setsByExercise = new Map<string, typeof allSets>()
  for (const set of allSets) {
    const existing = setsByExercise.get(set.exerciseId) || []
    existing.push(set)
    setsByExercise.set(set.exerciseId, existing)
  }

  if (adjustment > 0) {
    // Add sets by cloning the first set
    const newSetsData: Array<{
      exerciseId: string
      setNumber: number
      reps: string
      weight: string | null
      rpe: number | null
      rir: number | null
      userId: string
    }> = []

    // Track renumbering: setId -> newSetNumber
    const renumberUpdates: Array<{ id: string; setNumber: number }> = []

    for (const exercise of allExercises) {
      const currentSets = setsByExercise.get(exercise.id) || []
      if (currentSets.length === 0) continue

      const firstSet = currentSets[0]

      // Prepare new sets to create (will be inserted after first set)
      for (let i = 0; i < adjustment; i++) {
        newSetsData.push({
          exerciseId: exercise.id,
          setNumber: 1000 + i, // Temporary high number
          reps: firstSet.reps,
          weight: firstSet.weight,
          rpe: firstSet.rpe,
          rir: firstSet.rir,
          userId
        })
        addedCount++
      }

      // Plan renumbering: first set stays 1, new sets get 2..adjustment+1, rest shift
      // First set: position 1 (will be updated even if already 1 for consistency)
      renumberUpdates.push({ id: currentSets[0].id, setNumber: 1 })
      // Remaining original sets shift by adjustment positions
      for (let i = 1; i < currentSets.length; i++) {
        renumberUpdates.push({
          id: currentSets[i].id,
          setNumber: i + adjustment + 1
        })
      }
    }

    // Bulk create all new sets
    if (newSetsData.length > 0) {
      await tx.prescribedSet.createMany({ data: newSetsData })

      // Fetch newly created sets to get their IDs for renumbering
      const newSets = await tx.prescribedSet.findMany({
        where: {
          exerciseId: { in: exerciseIds },
          setNumber: { gte: 1000 }
        },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }]
      })

      // Group new sets by exercise and add renumbering
      const newSetsByExercise = new Map<string, typeof newSets>()
      for (const set of newSets) {
        const existing = newSetsByExercise.get(set.exerciseId) || []
        existing.push(set)
        newSetsByExercise.set(set.exerciseId, existing)
      }

      for (const [exerciseId, sets] of newSetsByExercise) {
        for (let i = 0; i < sets.length; i++) {
          renumberUpdates.push({ id: sets[i].id, setNumber: 2 + i })
        }
      }
    }

    // Batch renumber using raw SQL with CASE statement
    if (renumberUpdates.length > 0) {
      const caseWhen = renumberUpdates
        .map(u => `WHEN '${u.id}' THEN ${u.setNumber}`)
        .join(' ')
      const ids = renumberUpdates.map(u => `'${u.id}'`).join(',')

      await tx.$executeRawUnsafe(`
        UPDATE "PrescribedSet"
        SET "setNumber" = CASE id ${caseWhen} END
        WHERE id IN (${ids})
      `)
    }
  } else if (adjustment < 0) {
    // Remove sets from beginning (preserve harder sets at end)
    const removalCount = Math.abs(adjustment)
    const setsToDeleteIds: string[] = []
    const renumberUpdates: Array<{ id: string; setNumber: number }> = []

    for (const exercise of allExercises) {
      const sets = setsByExercise.get(exercise.id) || []

      // Skip exercises with only 1 set
      if (sets.length <= 1) {
        skippedCount++
        continue
      }

      // Calculate how many sets to actually remove (don't go below 1)
      const actualRemoval = Math.min(removalCount, sets.length - 1)

      // Mark first N sets for deletion
      for (let i = 0; i < actualRemoval; i++) {
        setsToDeleteIds.push(sets[i].id)
        removedCount++
      }

      // Plan renumbering for remaining sets
      const remainingSets = sets.slice(actualRemoval)
      for (let i = 0; i < remainingSets.length; i++) {
        renumberUpdates.push({ id: remainingSets[i].id, setNumber: i + 1 })
      }
    }

    // Bulk delete
    if (setsToDeleteIds.length > 0) {
      await tx.prescribedSet.deleteMany({
        where: { id: { in: setsToDeleteIds } }
      })
    }

    // Batch renumber using raw SQL
    if (renumberUpdates.length > 0) {
      const caseWhen = renumberUpdates
        .map(u => `WHEN '${u.id}' THEN ${u.setNumber}`)
        .join(' ')
      const ids = renumberUpdates.map(u => `'${u.id}'`).join(',')

      await tx.$executeRawUnsafe(`
        UPDATE "PrescribedSet"
        SET "setNumber" = CASE id ${caseWhen} END
        WHERE id IN (${ids})
      `)
    }
  }

  return { addedCount, removedCount, skippedCount }
}
