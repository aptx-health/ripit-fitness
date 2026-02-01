import { PrismaClient } from '@prisma/client';
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
 * Publishes a strength program to the community
 */
async function publishStrengthProgram(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<PublishResult> {
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
  const stats = calculateProgramStats(program, 'strength');

  const communityProgram = await prisma.communityProgram.create({
    data: {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: program.name,
      description: program.description || '',
      programType: 'strength',
      authorUserId: userId,
      displayName: displayName,
      originalProgramId: programId,
      programData: program as any,
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
}

/**
 * Publishes a cardio program to the community
 */
async function publishCardioProgram(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<PublishResult> {
  const program = await prisma.cardioProgram.findUnique({
    where: {
      id: programId,
      userId: userId,
    },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayNumber: 'asc' },
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
  const stats = calculateProgramStats(program, 'cardio');

  const communityProgram = await prisma.communityProgram.create({
    data: {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: program.name,
      description: program.description || '',
      programType: 'cardio',
      authorUserId: userId,
      displayName: displayName,
      originalProgramId: programId,
      programData: program as any,
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
}

/**
 * Publishes a program to the community
 * Handles both strength and cardio programs
 */
export async function publishProgramToCommunity(
  prisma: PrismaClient,
  programId: string,
  userId: string,
  programType: 'strength' | 'cardio'
): Promise<PublishResult> {
  try {
    if (programType === 'cardio') {
      return await publishCardioProgram(prisma, programId, userId);
    }
    return await publishStrengthProgram(prisma, programId, userId);
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
