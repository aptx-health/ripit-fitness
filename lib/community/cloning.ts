import { PrismaClient } from '@prisma/client';

export interface CloneResult {
  success: boolean;
  programId?: string;
  error?: string;
}

/**
 * Generates a unique program name by checking for existing programs and auto-incrementing
 * Checks both strength and cardio program tables to ensure uniqueness
 * Examples:
 * - "My Program (Community)" if no conflict
 * - "My Program (Community) (2)" if first name exists
 * - "My Program (Community) (3)" if first two exist
 */
async function generateUniqueProgramName(
  prisma: PrismaClient,
  baseName: string,
  userId: string
): Promise<string> {
  const suffix = ' (Community)';
  let candidateName = `${baseName}${suffix}`;

  // Check both strength and cardio programs for name conflicts
  const checkNameExists = async (name: string): Promise<boolean> => {
    const [strengthProgram, cardioProgram] = await Promise.all([
      prisma.program.findFirst({
        where: { userId: userId, name: name },
      }),
      prisma.cardioProgram.findFirst({
        where: { userId: userId, name: name },
      }),
    ]);
    return !!(strengthProgram || cardioProgram);
  };

  // Check if the base name with (Community) suffix is available
  const baseExists = await checkNameExists(candidateName);

  if (!baseExists) {
    return candidateName;
  }

  // Name is taken, start checking numbered variants
  let counter = 2;
  while (counter < 100) { // Safety limit to prevent infinite loop
    candidateName = `${baseName}${suffix} (${counter})`;

    const exists = await checkNameExists(candidateName);

    if (!exists) {
      return candidateName;
    }

    counter++;
  }

  // Fallback: append timestamp if somehow we hit 100 variants
  return `${baseName}${suffix} (${Date.now()})`;
}

/**
 * Clones a strength community program with background processing
 */
async function cloneStrengthProgram(
  prisma: PrismaClient,
  communityProgram: any,
  userId: string
): Promise<CloneResult> {
  const programData = communityProgram.programData as any;

  // Generate unique name upfront
  const uniqueName = await generateUniqueProgramName(
    prisma,
    communityProgram.name,
    userId
  );

  // Create shell program immediately
  const shellProgram = await prisma.program.create({
    data: {
      name: uniqueName,
      description: communityProgram.description,
      userId: userId,
      isActive: false,
      isArchived: false,
      programType: 'strength',
      isUserCreated: true,
      copyStatus: 'cloning',
    },
  });

  // Clone in background (fire and forget)
  cloneStrengthProgramData(prisma, shellProgram.id, programData, userId).catch((error) => {
    console.error('Failed to clone strength program:', error);
  });

  return {
    success: true,
    programId: shellProgram.id,
  };
}

/**
 * Background process to clone strength program data
 */
async function cloneStrengthProgramData(
  prisma: PrismaClient,
  programId: string,
  programData: any,
  userId: string
): Promise<void> {
  try {
    // Clone all data in single atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const week of programData.weeks) {
        const newWeek = await tx.week.create({
          data: {
            weekNumber: week.weekNumber,
            programId: programId,
            userId: userId,
          },
        });

        for (const workout of week.workouts) {
          const newWorkout = await tx.workout.create({
            data: {
              name: workout.name,
              dayNumber: workout.dayNumber,
              weekId: newWeek.id,
              userId: userId,
            },
          });

          for (const exercise of workout.exercises) {
            const newExercise = await tx.exercise.create({
              data: {
                name: exercise.name,
                exerciseDefinitionId: exercise.exerciseDefinitionId,
                order: exercise.order,
                exerciseGroup: exercise.exerciseGroup,
                workoutId: newWorkout.id,
                userId: userId,
                notes: exercise.notes,
              },
            });

            if (exercise.prescribedSets && exercise.prescribedSets.length > 0) {
              await tx.prescribedSet.createMany({
                data: exercise.prescribedSets.map((set: any) => ({
                  setNumber: set.setNumber,
                  reps: set.reps,
                  weight: set.weight,
                  rpe: set.rpe,
                  rir: set.rir,
                  exerciseId: newExercise.id,
                  userId: userId,
                })),
              });
            }
          }
        }
      }
    }, { timeout: 60000 }); // 60 second timeout for very large programs

    // Mark as ready
    await prisma.program.update({
      where: { id: programId },
      data: { copyStatus: 'ready' },
    });
  } catch (error) {
    console.error('Clone transaction failed, cleaning up:', error);

    // Delete the shell program on failure
    await prisma.program.delete({
      where: { id: programId },
    }).catch((deleteError) => {
      console.error('Failed to clean up shell program:', deleteError);
    });

    throw error;
  }
}

/**
 * Clones a cardio community program with background processing
 */
async function cloneCardioProgram(
  prisma: PrismaClient,
  communityProgram: any,
  userId: string
): Promise<CloneResult> {
  const programData = communityProgram.programData as any;

  // Generate unique name upfront
  const uniqueName = await generateUniqueProgramName(
    prisma,
    communityProgram.name,
    userId
  );

  // Create shell program immediately
  const shellProgram = await prisma.cardioProgram.create({
    data: {
      name: uniqueName,
      description: communityProgram.description,
      userId: userId,
      isActive: false,
      isArchived: false,
      isUserCreated: true,
      copyStatus: 'cloning',
    },
  });

  // Clone in background (fire and forget)
  cloneCardioProgramData(prisma, shellProgram.id, programData, userId).catch((error) => {
    console.error('Failed to clone cardio program:', error);
  });

  return {
    success: true,
    programId: shellProgram.id,
  };
}

/**
 * Background process to clone cardio program data
 */
async function cloneCardioProgramData(
  prisma: PrismaClient,
  programId: string,
  programData: any,
  userId: string
): Promise<void> {
  try {
    // Clone all data in single atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const week of programData.weeks) {
        const newWeek = await tx.cardioWeek.create({
          data: {
            weekNumber: week.weekNumber,
            cardioProgramId: programId,
            userId: userId,
          },
        });

        for (const session of week.sessions) {
          await tx.prescribedCardioSession.create({
            data: {
              weekId: newWeek.id,
              dayNumber: session.dayNumber,
              name: session.name,
              description: session.description,
              targetDuration: session.targetDuration,
              intensityZone: session.intensityZone,
              equipment: session.equipment,
              targetHRRange: session.targetHRRange,
              targetPowerRange: session.targetPowerRange,
              intervalStructure: session.intervalStructure,
              notes: session.notes,
              userId: userId,
            },
          });
        }
      }
    }, { timeout: 60000 }); // 60 second timeout for very large programs

    // Mark as ready
    await prisma.cardioProgram.update({
      where: { id: programId },
      data: { copyStatus: 'ready' },
    });
  } catch (error) {
    console.error('Clone transaction failed, cleaning up:', error);

    // Delete the shell program on failure
    await prisma.cardioProgram.delete({
      where: { id: programId },
    }).catch((deleteError) => {
      console.error('Failed to clean up shell cardio program:', deleteError);
    });

    throw error;
  }
}

/**
 * Clones a community program to a user's personal collection
 * Handles both strength and cardio programs
 */
export async function cloneCommunityProgram(
  prisma: PrismaClient,
  communityProgramId: string,
  userId: string
): Promise<CloneResult> {
  try {
    const communityProgram = await prisma.communityProgram.findUnique({
      where: { id: communityProgramId },
      select: {
        id: true,
        name: true,
        description: true,
        programType: true,
        programData: true,
      },
    });

    if (!communityProgram) {
      return {
        success: false,
        error: 'Community program not found',
      };
    }

    const programData = communityProgram.programData as any;

    if (!programData || !programData.weeks) {
      return {
        success: false,
        error: 'Invalid program data',
      };
    }

    if (communityProgram.programType === 'cardio') {
      return await cloneCardioProgram(prisma, communityProgram, userId);
    }

    return await cloneStrengthProgram(prisma, communityProgram, userId);
  } catch (error) {
    console.error('Failed to clone community program:', error);
    return {
      success: false,
      error: 'Failed to add program',
    };
  }
}
