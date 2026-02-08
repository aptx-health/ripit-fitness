import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

/**
 * Restart a program by archiving workout completions
 * This preserves all logged sets for history while allowing the user to start fresh
 */
export async function restartProgram(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<{ success: boolean; archivedCompletions: number }> {
  logger.debug({ programId, userId }, 'Starting program restart')

  // Verify program ownership
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!program) {
    throw new Error('Program not found')
  }

  logger.debug({ programName: program.name }, 'Program found')

  // Run independent queries in parallel
  const [maxCycleCompletion, workouts] = await Promise.all([
    // Get current max cycle number for this program
    prisma.workoutCompletion.findFirst({
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
    }),
    // Get all workout IDs for this program
    prisma.workout.findMany({
      where: {
        week: {
          programId,
        },
        userId,
      },
      select: {
        id: true,
      },
    }),
  ])

  const currentCycle = maxCycleCompletion?.cycleNumber || 1
  const workoutIdList = workouts.map((w) => w.id)

  logger.debug({ currentCycle, workoutCount: workoutIdList.length }, 'Found workouts for program')

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

  logger.info({ archivedCompletions: result.count, programId }, 'Program restarted successfully')

  return {
    success: true,
    archivedCompletions: result.count,
  }
}
