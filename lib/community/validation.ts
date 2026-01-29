import { PrismaClient } from '@prisma/client';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProgramStats {
  weekCount: number;
  workoutCount: number;
  exerciseCount: number;
}

/**
 * Validates a strength program for publishing
 */
async function validateStrengthProgram(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
      userId: userId,
    },
    include: {
      weeks: {
        include: {
          workouts: {
            include: {
              exercises: {
                include: {
                  prescribedSets: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program) {
    errors.push('Program not found');
    return { valid: false, errors };
  }

  if (!program.name || program.name.trim() === '') {
    errors.push('Program must have a name');
  }

  if (!program.description || program.description.trim() === '') {
    errors.push('Program must have a description before publishing');
  }

  if (!program.weeks || program.weeks.length === 0) {
    errors.push('Program must have at least one week');
  }

  const hasWorkouts = program.weeks.some((week) => week.workouts.length > 0);
  if (!hasWorkouts) {
    errors.push('Program must have at least one workout');
  }

  const hasExercises = program.weeks.some((week) =>
    week.workouts.some((workout) => workout.exercises.length > 0)
  );
  if (!hasExercises) {
    errors.push('Program must have at least one exercise');
  }

  const exercisesWithoutSets: string[] = [];
  program.weeks.forEach((week) => {
    week.workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!exercise.prescribedSets || exercise.prescribedSets.length === 0) {
          exercisesWithoutSets.push(exercise.name);
        }
      });
    });
  });

  if (exercisesWithoutSets.length > 0) {
    errors.push('All exercises must have at least one prescribed set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a cardio program for publishing
 */
async function validateCardioProgram(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  const program = await prisma.cardioProgram.findUnique({
    where: {
      id: programId,
      userId: userId,
    },
    include: {
      weeks: {
        include: {
          sessions: true,
        },
      },
    },
  });

  if (!program) {
    errors.push('Program not found');
    return { valid: false, errors };
  }

  if (!program.name || program.name.trim() === '') {
    errors.push('Program must have a name');
  }

  if (!program.description || program.description.trim() === '') {
    errors.push('Program must have a description before publishing');
  }

  if (!program.weeks || program.weeks.length === 0) {
    errors.push('Program must have at least one week');
  }

  const hasSessions = program.weeks.some((week) => week.sessions.length > 0);
  if (!hasSessions) {
    errors.push('Program must have at least one cardio session');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that a program meets all requirements for publishing to the community
 * Handles both strength and cardio programs
 */
export async function validateProgramForPublishing(
  prisma: PrismaClient,
  programId: string,
  userId: string,
  programType: 'strength' | 'cardio'
): Promise<ValidationResult> {
  if (programType === 'cardio') {
    return validateCardioProgram(prisma, programId, userId);
  }
  return validateStrengthProgram(prisma, programId, userId);
}

/**
 * Calculates program statistics for metadata
 * Handles both strength and cardio programs
 */
export function calculateProgramStats(
  program: any,
  programType: 'strength' | 'cardio'
): ProgramStats {
  const weekCount = program.weeks.length;

  let workoutCount = 0;
  let exerciseCount = 0;

  if (programType === 'cardio') {
    // For cardio: count sessions instead of workouts/exercises
    program.weeks.forEach((week: any) => {
      workoutCount += week.sessions?.length || 0;
    });
    // Cardio programs don't have exercises, so exerciseCount stays 0
  } else {
    // For strength: count workouts and exercises
    program.weeks.forEach((week: any) => {
      workoutCount += week.workouts?.length || 0;
      week.workouts?.forEach((workout: any) => {
        exerciseCount += workout.exercises?.length || 0;
      });
    });
  }

  return {
    weekCount,
    workoutCount,
    exerciseCount,
  };
}

/**
 * Checks if a program has already been published to the community
 */
export async function isProgramPublished(
  prisma: PrismaClient,
  programId: string
): Promise<boolean> {
  const existingCommunityProgram = await prisma.communityProgram.findUnique({
    where: {
      originalProgramId: programId,
    },
  });

  return existingCommunityProgram !== null;
}
