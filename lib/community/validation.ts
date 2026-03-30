import type { PrismaClient } from '@prisma/client';
import { MAX_WORKOUTS_PER_WEEK } from '@/lib/validation/workout-limits';

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

  // Validate workout count per week
  const weeksExceedingLimit = program.weeks.filter(
    (week) => week.workouts.length > MAX_WORKOUTS_PER_WEEK
  );
  if (weeksExceedingLimit.length > 0) {
    const weekNumbers = weeksExceedingLimit.map((w) => w.weekNumber).join(', ');
    errors.push(
      `Week(s) ${weekNumbers} exceed the maximum of ${MAX_WORKOUTS_PER_WEEK} workouts per week`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates program statistics for metadata
 */
interface ProgramWithWeeks {
  weeks: Array<{
    workouts?: Array<{
      exercises?: unknown[];
    }>;
  }>;
}

export function calculateProgramStats(
  program: ProgramWithWeeks
): ProgramStats {
  const weekCount = program.weeks.length;

  let workoutCount = 0;
  let exerciseCount = 0;

  program.weeks.forEach((week) => {
    workoutCount += week.workouts?.length || 0;
    week.workouts?.forEach((workout) => {
      exerciseCount += workout.exercises?.length || 0;
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

/**
 * Validates program metadata (level, goals, etc.)
 * This should only be called when actually publishing, not during initial validation
 */
// biome-ignore lint/suspicious/noExplicitAny: dynamic program metadata fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateProgramMetadata(program: Record<string, any>): ValidationResult {
  const errors: string[] = [];

  if (!program.level || program.level.trim() === '') {
    errors.push(
      'Program must have a fitness level (Beginner, Intermediate, or Advanced)'
    );
  }

  if (!program.goals || program.goals.length === 0) {
    errors.push('Program must have at least one training goal');
  }

  if (
    program.targetDaysPerWeek &&
    (program.targetDaysPerWeek < 1 || program.targetDaysPerWeek > 7)
  ) {
    errors.push('Target days per week must be between 1 and 7');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
