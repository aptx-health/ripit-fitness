import { PrismaClient } from '@prisma/client';
import { calculateProgramStats } from './validation';

export interface PublishResult {
  success: boolean;
  communityProgramId?: string;
  error?: string;
}

/**
 * Gets the user's display name from UserSettings, fallback to "Anonymous User"
 */
export async function getUserDisplayName(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { displayName: true },
  });

  // If no settings or displayName is null/empty, return fallback
  if (!userSettings || !userSettings.displayName || userSettings.displayName.trim() === '') {
    return 'Anonymous User';
  }

  return userSettings.displayName;
}

/**
 * Publishes a program to the community
 */
export async function publishProgramToCommunity(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<PublishResult> {
  try {
    // Fetch full program with all nested data
    const program = await prisma.program.findUnique({
      where: {
        id: programId,
        userId: userId,
      },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            workouts: {
              orderBy: { dayNumber: 'asc' },
              include: {
                exercises: {
                  orderBy: { order: 'asc' },
                  include: {
                    prescribedSets: {
                      orderBy: { setNumber: 'asc' },
                    },
                    exerciseDefinition: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!program) {
      return {
        success: false,
        error: 'Program not found',
      };
    }

    // Get user's display name
    const displayName = await getUserDisplayName(prisma, userId);

    // Calculate program stats
    const stats = calculateProgramStats(program);

    // Create community program with denormalized data
    const communityProgram = await prisma.communityProgram.create({
      data: {
        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: program.name,
        description: program.description || '',
        programType: program.programType,
        authorUserId: userId,
        displayName: displayName,
        originalProgramId: programId,
        programData: program as any, // Store full program structure as JSON
        weekCount: stats.weekCount,
        workoutCount: stats.workoutCount,
        exerciseCount: stats.exerciseCount,
      },
    });

    return {
      success: true,
      communityProgramId: communityProgram.id,
    };
  } catch (error: any) {
    // Handle unique constraint violation (duplicate publication)
    if (error.code === 'P2002' || error.message?.includes('unique constraint')) {
      return {
        success: false,
        error: 'This program has already been published to the community',
      };
    }

    console.error('Failed to publish program:', error);
    return {
      success: false,
      error: 'Failed to publish program',
    };
  }
}
