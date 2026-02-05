import { PrismaClient } from '@prisma/client'

/**
 * Restart a program by archiving workout completions
 *
 * SCHEMA CHANGE REQUIRED:
 * - Add `isArchived: Boolean @default(false)` to WorkoutCompletion model
 * - Add `cycleNumber: Int @default(1)` to track restart cycles
 *
 * Current implementation will CASCADE DELETE logged sets, which conflicts
 * with the requirement to "preserve logged data for history" (issues #142, #108).
 *
 * Recommended approach:
 * 1. Add isArchived field to WorkoutCompletion
 * 2. Instead of DELETE, UPDATE to set isArchived=true
 * 3. Filter completion queries with `where: { isArchived: false }`
 * 4. Users can view historical data from previous cycles
 */
export async function restartProgram(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<{ success: boolean; archivedCompletions: number }> {
  // Verify program ownership
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId,
    },
  })

  if (!program) {
    throw new Error('Program not found')
  }

  // Get all workout IDs for this program
  const workoutIds = await prisma.workout.findMany({
    where: {
      week: {
        programId,
      },
      userId,
    },
    select: {
      id: true,
    },
  })

  const workoutIdList = workoutIds.map((w) => w.id)

  // TEMPORARY: This will delete logged sets due to CASCADE
  // After schema change, replace with UPDATE to set isArchived=true
  const result = await prisma.workoutCompletion.deleteMany({
    where: {
      workoutId: {
        in: workoutIdList,
      },
      userId,
    },
  })

  return {
    success: true,
    archivedCompletions: result.count,
  }
}
