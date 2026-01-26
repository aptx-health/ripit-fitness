import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase } from '@/lib/test/database';
import {
  createTestUser,
  createTestProgram,
  createTestPrescribedSets,
} from '@/lib/test/factories';
import {
  validateProgramForPublishing,
  isProgramPublished,
  calculateProgramStats,
} from '@/lib/community/validation';
import {
  getUserDisplayName,
  publishProgramToCommunity,
} from '@/lib/community/publishing';
import { cloneCommunityProgram } from '@/lib/community/cloning';

describe('Community Programs API', () => {
  let prisma: PrismaClient;
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    const testDb = await getTestDatabase();
    prisma = testDb.getPrismaClient();
    await testDb.reset();

    const user = await createTestUser();
    userId = user.id;

    const otherUser = await createTestUser();
    otherUserId = otherUser.id;
  });

  describe('Program Validation', () => {
    it('should validate a valid program with all required fields', async () => {
      // Arrange: Create a complete program
      const program = await createTestProgram(prisma, userId, {
        weeks: 2,
        workoutsPerWeek: 3,
        exercisesPerWorkout: 2,
      });

      // Add prescribed sets to all exercises
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      // Act: Validate the program
      const validation = await validateProgramForPublishing(
        prisma,
        program.id,
        userId
      );

      // Assert: Validation should pass
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation if program has no description', async () => {
      // Arrange: Create program without description
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          description: null,
          userId,
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              userId,
              workouts: {
                create: {
                  name: 'Day 1',
                  dayNumber: 1,
                  userId,
                },
              },
            },
          },
        },
      });

      // Act: Validate the program
      const validation = await validateProgramForPublishing(
        prisma,
        program.id,
        userId
      );

      // Assert: Validation should fail
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Program must have a description before publishing'
      );
    });

    it('should fail validation if program has no exercises', async () => {
      // Arrange: Create program with workout but no exercises
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          description: 'Test description',
          userId,
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              userId,
              workouts: {
                create: {
                  name: 'Day 1',
                  dayNumber: 1,
                  userId,
                },
              },
            },
          },
        },
      });

      // Act: Validate the program
      const validation = await validateProgramForPublishing(
        prisma,
        program.id,
        userId
      );

      // Assert: Validation should fail
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Program must have at least one exercise');
    });

    it('should fail validation if exercises have no prescribed sets', async () => {
      // Arrange: Create program with exercises but no prescribed sets
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 2,
      });
      // Note: Not adding prescribed sets

      // Act: Validate the program
      const validation = await validateProgramForPublishing(
        prisma,
        program.id,
        userId
      );

      // Assert: Validation should fail
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'All exercises must have at least one prescribed set'
      );
    });

    it('should calculate program stats correctly', async () => {
      // Arrange: Create program with known structure
      const program = await createTestProgram(prisma, userId, {
        weeks: 3,
        workoutsPerWeek: 4,
        exercisesPerWorkout: 5,
      });

      // Fetch full program structure
      const fullProgram = await prisma.program.findUnique({
        where: { id: program.id },
        include: {
          weeks: {
            include: {
              workouts: {
                include: {
                  exercises: true,
                },
              },
            },
          },
        },
      });

      // Act: Calculate stats
      const stats = calculateProgramStats(fullProgram!);

      // Assert: Stats should be correct
      expect(stats.weekCount).toBe(3);
      expect(stats.workoutCount).toBe(12); // 3 weeks * 4 workouts
      expect(stats.exerciseCount).toBe(60); // 12 workouts * 5 exercises
    });
  });

  describe('Publishing to Community', () => {
    it('should publish a valid program to community', async () => {
      // Arrange: Create a valid program
      const program = await createTestProgram(prisma, userId, {
        weeks: 2,
        workoutsPerWeek: 2,
        exercisesPerWorkout: 2,
      });

      // Add prescribed sets
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      // Create user settings with display name
      await prisma.userSettings.create({
        data: {
          userId,
          displayName: 'Test Author',
        },
      });

      // Act: Publish the program
      const result = await publishProgramToCommunity(prisma, program.id, userId);

      // Assert: Publishing should succeed
      expect(result.success).toBe(true);
      expect(result.communityProgramId).toBeDefined();

      // Verify in database
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { id: result.communityProgramId },
      });

      expect(communityProgram).toBeTruthy();
      expect(communityProgram!.name).toBe(program.name);
      expect(communityProgram!.displayName).toBe('Test Author');
      expect(communityProgram!.authorUserId).toBe(userId);
      expect(communityProgram!.originalProgramId).toBe(program.id);
      expect(communityProgram!.weekCount).toBe(2);
      expect(communityProgram!.workoutCount).toBe(4);
      expect(communityProgram!.exerciseCount).toBe(8);

      // Verify programData JSON contains the full structure
      const programData = communityProgram!.programData as any;
      expect(programData.weeks).toBeDefined();
      expect(programData.weeks.length).toBe(2);
    });

    it('should use "Anonymous User" if display name is not set', async () => {
      // Arrange: Create program without user settings
      const program = await createTestProgram(prisma, userId);

      // Add prescribed sets
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      // Act: Get display name
      const displayName = await getUserDisplayName(prisma, userId);

      // Assert: Should return fallback
      expect(displayName).toBe('Anonymous User');
    });

    it('should prevent duplicate publication of the same program', async () => {
      // Arrange: Create and publish a program
      const program = await createTestProgram(prisma, userId);

      // Add prescribed sets
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      const firstPublish = await publishProgramToCommunity(
        prisma,
        program.id,
        userId
      );
      expect(firstPublish.success).toBe(true);

      // Act: Try to publish again
      const secondPublish = await publishProgramToCommunity(
        prisma,
        program.id,
        userId
      );

      // Assert: Should fail with duplicate error
      expect(secondPublish.success).toBe(false);
      expect(secondPublish.error).toBe(
        'This program has already been published to the community'
      );
    });

    it('should detect if program is already published', async () => {
      // Arrange: Create and publish a program
      const program = await createTestProgram(prisma, userId);

      // Add prescribed sets
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      await publishProgramToCommunity(prisma, program.id, userId);

      // Act: Check if published
      const isPublished = await isProgramPublished(prisma, program.id);

      // Assert: Should return true
      expect(isPublished).toBe(true);
    });
  });

  describe('Cloning Community Programs', () => {
    it('should clone a community program to user collection', async () => {
      // Arrange: Create and publish a program
      const originalProgram = await createTestProgram(prisma, userId, {
        name: 'Original Program',
        weeks: 2,
        workoutsPerWeek: 2,
        exercisesPerWorkout: 2,
      });

      // Add prescribed sets
      for (const week of originalProgram.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      const publishResult = await publishProgramToCommunity(
        prisma,
        originalProgram.id,
        userId
      );

      // Act: Clone the community program
      const cloneResult = await cloneCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        otherUserId
      );

      // Assert: Cloning should succeed
      expect(cloneResult.success).toBe(true);
      expect(cloneResult.programId).toBeDefined();

      // Verify cloned program in database
      const clonedProgram = await prisma.program.findUnique({
        where: { id: cloneResult.programId },
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

      expect(clonedProgram).toBeTruthy();
      expect(clonedProgram!.name).toBe('Original Program (Community)');
      expect(clonedProgram!.userId).toBe(otherUserId);
      expect(clonedProgram!.isActive).toBe(false);
      expect(clonedProgram!.isUserCreated).toBe(true);
      expect(clonedProgram!.weeks.length).toBe(2);

      // Verify all nested data was cloned
      expect(clonedProgram!.weeks[0].workouts.length).toBe(2);
      expect(clonedProgram!.weeks[0].workouts[0].exercises.length).toBe(2);
      expect(
        clonedProgram!.weeks[0].workouts[0].exercises[0].prescribedSets.length
      ).toBe(3);
    });

    it('should create independent clone (no link to original)', async () => {
      // Arrange: Create, publish, and clone a program
      const originalProgram = await createTestProgram(prisma, userId);

      // Add prescribed sets
      for (const week of originalProgram.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      const publishResult = await publishProgramToCommunity(
        prisma,
        originalProgram.id,
        userId
      );

      const cloneResult = await cloneCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        otherUserId
      );

      // Act: Delete the original personal program
      await prisma.program.delete({
        where: { id: originalProgram.id },
      });

      // Assert: Community program should still exist
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { id: publishResult.communityProgramId },
      });
      expect(communityProgram).toBeTruthy();

      // Assert: Cloned program should still exist
      const clonedProgram = await prisma.program.findUnique({
        where: { id: cloneResult.programId },
      });
      expect(clonedProgram).toBeTruthy();
    });

    it('should fail to clone non-existent community program', async () => {
      // Act: Try to clone a non-existent program
      const result = await cloneCommunityProgram(
        prisma,
        'non-existent-id',
        userId
      );

      // Assert: Should fail
      expect(result.success).toBe(false);
      expect(result.error).toBe('Community program not found');
    });
  });

  describe('Deleting Community Programs', () => {
    it('should allow author to delete their own published program', async () => {
      // Arrange: Create and publish a program
      const program = await createTestProgram(prisma, userId);

      // Add prescribed sets
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      const publishResult = await publishProgramToCommunity(
        prisma,
        program.id,
        userId
      );

      // Act: Delete the community program
      const result = await simulateDeleteCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        userId
      );

      // Assert: Deletion should succeed
      expect(result.success).toBe(true);

      // Verify it's deleted from database
      const deletedProgram = await prisma.communityProgram.findUnique({
        where: { id: publishResult.communityProgramId },
      });
      expect(deletedProgram).toBeNull();
    });

    it('should prevent non-author from deleting published program', async () => {
      // Arrange: Create and publish a program
      const program = await createTestProgram(prisma, userId);

      // Add prescribed sets
      for (const week of program.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      const publishResult = await publishProgramToCommunity(
        prisma,
        program.id,
        userId
      );

      // Act: Try to delete as different user
      const result = await simulateDeleteCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        otherUserId
      );

      // Assert: Should fail with Forbidden error
      expect(result.success).toBe(false);
      expect(result.error).toBe('You can only delete your own published programs');

      // Verify it's still in database
      const stillExists = await prisma.communityProgram.findUnique({
        where: { id: publishResult.communityProgramId },
      });
      expect(stillExists).toBeTruthy();
    });
  });

  describe('Browse Community Programs', () => {
    it('should return all community programs ordered by published date', async () => {
      // Arrange: Create and publish multiple programs
      const program1 = await createTestProgram(prisma, userId, {
        name: 'Program 1',
      });
      const program2 = await createTestProgram(prisma, userId, {
        name: 'Program 2',
      });

      // Add prescribed sets to both
      for (const program of [program1, program2]) {
        for (const week of program.weeks) {
          for (const workout of week.workouts) {
            for (const exercise of workout.exercises) {
              await createTestPrescribedSets(prisma, exercise.id, userId, 3);
            }
          }
        }
      }

      await publishProgramToCommunity(prisma, program1.id, userId);
      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      await publishProgramToCommunity(prisma, program2.id, userId);

      // Act: Browse community programs
      const result = await simulateBrowseCommunityPrograms(prisma, userId);

      // Assert: Should return all programs
      expect(result.success).toBe(true);
      expect(result.programs).toBeDefined();
      expect(result.programs!.length).toBe(2);
      // Newest first
      expect(result.programs![0].name).toBe('Program 2');
      expect(result.programs![1].name).toBe('Program 1');
    });
  });
});

// Simulation functions that replicate API logic

async function simulateDeleteCommunityProgram(
  prisma: PrismaClient,
  communityProgramId: string,
  userId: string
) {
  try {
    // Fetch the community program to verify ownership
    const communityProgram = await prisma.communityProgram.findUnique({
      where: { id: communityProgramId },
      select: { id: true, authorUserId: true },
    });

    if (!communityProgram) {
      return {
        success: false,
        error: 'Community program not found',
      };
    }

    // Verify user is the author
    if (communityProgram.authorUserId !== userId) {
      return {
        success: false,
        error: 'You can only delete your own published programs',
      };
    }

    // Delete the community program
    await prisma.communityProgram.delete({
      where: { id: communityProgramId },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Internal server error' };
  }
}

async function simulateBrowseCommunityPrograms(
  prisma: PrismaClient,
  userId: string
) {
  try {
    // Fetch all community programs ordered by published date
    const communityPrograms = await prisma.communityProgram.findMany({
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        programType: true,
        displayName: true,
        publishedAt: true,
        weekCount: true,
        workoutCount: true,
        exerciseCount: true,
      },
    });

    return {
      success: true,
      programs: communityPrograms,
    };
  } catch (error) {
    return { success: false, error: 'Internal server error' };
  }
}
