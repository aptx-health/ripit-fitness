import { PrismaClient } from '@prisma/client'

/**
 * Restart a program by archiving workout completions
 * This preserves all logged sets for history while allowing the user to start fresh
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

  // Get current max cycle number for this program
  const maxCycleCompletion = await prisma.workoutCompletion.findFirst({
    where: {
      workout: {
        week: {
          programId,
        },
      },
      userId,
    },
    orderBy: {
      cycleNumber: 'desc',
    },
    select: {
      cycleNumber: true,
    },
  })

  const currentCycle = maxCycleCompletion?.cycleNumber || 1

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

  // Archive all non-archived completions by setting isArchived=true
  // This preserves logged sets while removing them from current cycle queries
  const result = await prisma.workoutCompletion.updateMany({
    where: {
      workoutId: {
        in: workoutIdList,
      },
      userId,
      isArchived: false,
    },
    data: {
      isArchived: true,
    },
  })

  return {
    success: true,
    archivedCompletions: result.count,
  }
}
