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
 * Validates that a program meets all requirements for publishing to the community
 */
export async function validateProgramForPublishing(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Fetch program with all nested data
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
      userId: userId, // Ensure user owns this program
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

  // Check required fields
  if (!program.name || program.name.trim() === '') {
    errors.push('Program must have a name');
  }

  if (!program.description || program.description.trim() === '') {
    errors.push('Program must have a description before publishing');
  }

  // Check structure
  if (!program.weeks || program.weeks.length === 0) {
    errors.push('Program must have at least one week');
  }

  // Check for workouts
  const hasWorkouts = program.weeks.some((week) => week.workouts.length > 0);
  if (!hasWorkouts) {
    errors.push('Program must have at least one workout');
  }

  // Check for exercises
  const hasExercises = program.weeks.some((week) =>
    week.workouts.some((workout) => workout.exercises.length > 0)
  );
  if (!hasExercises) {
    errors.push('Program must have at least one exercise');
  }

  // Check that all exercises have prescribed sets
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
 * Calculates program statistics for metadata
 */
export function calculateProgramStats(program: {
  weeks: {
    workouts: {
      exercises: unknown[];
    }[];
  }[];
}): ProgramStats {
  const weekCount = program.weeks.length;

  let workoutCount = 0;
  let exerciseCount = 0;

  program.weeks.forEach((week) => {
    workoutCount += week.workouts.length;
    week.workouts.forEach((workout) => {
      exerciseCount += workout.exercises.length;
    });
  });

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
