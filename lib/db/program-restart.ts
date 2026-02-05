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
  console.log(`[restartProgram] Starting restart for program ${programId}, user ${userId}`)

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

  console.log(`[restartProgram] Program found: ${program.name}`)

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
  console.log(`[restartProgram] Current cycle: ${currentCycle}`)

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
  console.log(`[restartProgram] Found ${workoutIdList.length} workouts:`, workoutIdList)

  // Check how many completions exist before archiving
  const existingCompletions = await prisma.workoutCompletion.findMany({
    where: {
      workoutId: {
        in: workoutIdList,
      },
      userId,
    },
    select: {
      id: true,
      workoutId: true,
      status: true,
      isArchived: true,
    },
  })

  console.log(`[restartProgram] Total completions: ${existingCompletions.length}`)
  console.log(`[restartProgram] Completions detail:`, JSON.stringify(existingCompletions, null, 2))

  const nonArchivedCount = existingCompletions.filter(c => !c.isArchived).length
  console.log(`[restartProgram] Non-archived completions to archive: ${nonArchivedCount}`)

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

  console.log(`[restartProgram] Successfully archived ${result.count} completions`)

  return {
    success: true,
    archivedCompletions: result.count,
  }
}
