import type { Prisma, PrismaClient } from '@prisma/client';
import { calculateProgramStats, validateProgramMetadata } from './validation';

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

    // Validate metadata
    const metadataValidation = validateProgramMetadata(program);
    if (!metadataValidation.valid) {
      return {
        success: false,
        error: `Program metadata incomplete: ${metadataValidation.errors.join(', ')}`,
      };
    }

    const displayName = await getUserDisplayName(prisma, userId);
    const stats = calculateProgramStats(program);

    const communityProgram = await prisma.communityProgram.create({
      data: {
        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: program.name,
        description: program.description || '',
        programType: 'strength',
        authorUserId: userId,
        displayName: displayName,
        originalProgramId: programId,
        programData: program as unknown as Prisma.JsonObject,
        weekCount: stats.weekCount,
        workoutCount: stats.workoutCount,
        exerciseCount: stats.exerciseCount,
        goals: program.goals,
        level: program.level,
        durationWeeks: program.durationWeeks || stats.weekCount,
        durationDisplay: program.durationDisplay,
        targetDaysPerWeek: program.targetDaysPerWeek,
        equipmentNeeded: program.equipmentNeeded,
        focusAreas: program.focusAreas,
      },
    });

    return {
      success: true,
      communityProgramId: communityProgram.id,
    };
  } catch (error: unknown) {
    // Handle unique constraint violation (duplicate publication)
    const prismaError = error as { code?: string; message?: string };
    if (prismaError.code === 'P2002' || prismaError.message?.includes('unique constraint')) {
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
