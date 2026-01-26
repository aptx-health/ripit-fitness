import { PrismaClient } from '@prisma/client';

export interface CloneResult {
  success: boolean;
  programId?: string;
  error?: string;
}

/**
 * Clones a community program to a user's personal collection
 */
export async function cloneCommunityProgram(
  prisma: PrismaClient,
  communityProgramId: string,
  userId: string
): Promise<CloneResult> {
  try {
    // Fetch the community program
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

    // Extract program data from JSON
    const programData = communityProgram.programData as any;

    if (!programData || !programData.weeks) {
      return {
        success: false,
        error: 'Invalid program data',
      };
    }

    // Deep copy the entire program structure in a transaction
    const clonedProgram = await prisma.$transaction(async (tx) => {
      // Create the new program
      const newProgram = await tx.program.create({
        data: {
          name: `${communityProgram.name} (Community)`,
          description: communityProgram.description,
          userId: userId,
          isActive: false, // Cloned programs start as inactive
          isArchived: false,
          programType: communityProgram.programType,
          isUserCreated: true, // Mark as user-created
        },
      });

      // Clone all weeks and their nested content
      for (const week of programData.weeks) {
        const newWeek = await tx.week.create({
          data: {
            weekNumber: week.weekNumber,
            programId: newProgram.id,
            userId: userId,
          },
        });

        // Clone all workouts in this week
        for (const workout of week.workouts) {
          const newWorkout = await tx.workout.create({
            data: {
              name: workout.name,
              dayNumber: workout.dayNumber,
              weekId: newWeek.id,
              userId: userId,
            },
          });

          // Clone all exercises in this workout
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

            // Clone all prescribed sets for this exercise
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

      return newProgram;
    });

    return {
      success: true,
      programId: clonedProgram.id,
    };
  } catch (error) {
    console.error('Failed to clone community program:', error);
    return {
      success: false,
      error: 'Failed to add program',
    };
  }
}
