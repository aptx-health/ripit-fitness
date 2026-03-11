/**
 * @vitest-environment node
 */

import type { PrismaClient } from '@prisma/client';
import { type Job, Queue, QueueEvents, Worker } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cloneCommunityProgram } from '@/lib/community/cloning';
import { publishProgramToCommunity } from '@/lib/community/publishing';
import type { ProgramCloneJob } from '@/lib/queue/clone-jobs';
import { getTestDatabase } from '@/lib/test/database';
import {
  createTestPrescribedSets,
  createTestProgram,
  createTestUser,
} from '@/lib/test/factories';
import { startRedisContainer, stopRedisContainer } from '@/lib/test/redis-container';

// Import cloning functions from worker
import {
  cloneCardioProgramData,
  cloneStrengthProgramData,
} from '../../cloud-functions/clone-program/src/cloning';

const QUEUE_NAME = 'program-clone-jobs';

describe('Program Cloning via BullMQ Worker', () => {
  let prisma: PrismaClient;
  let queue: Queue;
  let queueEvents: QueueEvents;
  let testWorker: Worker;
  let userId: string;
  let otherUserId: string;

  function getConnection() {
    const parsed = new URL(process.env.REDIS_URL!);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null as null,
    };
  }

  beforeAll(async () => {
    // Start Redis container
    await startRedisContainer();

    // Create queue for enqueuing jobs
    queue = new Queue(QUEUE_NAME, { connection: getConnection() });

    // Create QueueEvents for awaiting job completion
    queueEvents = new QueueEvents(QUEUE_NAME, { connection: getConnection() });

    // Start a temporary worker that processes jobs using the real cloning logic
    testWorker = new Worker(
      QUEUE_NAME,
      async (job: Job<ProgramCloneJob>) => {
        const { communityProgramId, programId, userId: jobUserId, programType } = job.data;

        const communityProgram = await prisma.communityProgram.findUnique({
          where: { id: communityProgramId },
          select: { programData: true },
        });

        if (!communityProgram || !communityProgram.programData) {
          throw new Error('Community program not found');
        }

        const programData = communityProgram.programData as any;

        if (programType === 'cardio') {
          await cloneCardioProgramData(prisma as any, programId, programData, jobUserId);
        } else {
          await cloneStrengthProgramData(prisma as any, programId, programData, jobUserId);
        }
      },
      { connection: getConnection(), concurrency: 1 }
    );
  }, 60000);

  afterAll(async () => {
    await testWorker.close();
    await queueEvents.close();
    await queue.close();
    await stopRedisContainer();
  }, 10000);

  beforeEach(async () => {
    const testDb = await getTestDatabase();
    prisma = testDb.getPrismaClient();
    await testDb.reset();

    // Drain any leftover jobs from previous tests
    await queue.drain();

    const user = await createTestUser();
    userId = user.id;

    const otherUser = await createTestUser();
    otherUserId = otherUser.id;
  });

  /**
   * Helper: Enqueue a clone job and wait for completion.
   */
  async function _enqueueAndWaitForCloneJob(job: ProgramCloneJob, timeoutMs: number = 15000): Promise<void> {
    const bullJob = await queue.add('clone', job, {
      attempts: 1,
      removeOnComplete: true,
    });

    const result = await bullJob.waitUntilFinished(queueEvents, timeoutMs);
    return result;
  }

  describe('Strength Program Cloning', () => {
    it('should clone a strength program with all nested data', async () => {
      // Arrange: Create and publish a strength program
      const originalProgram = await createTestProgram(prisma, userId, {
        name: 'Test Strength Program',
        weeks: 2,
        workoutsPerWeek: 3,
        exercisesPerWorkout: 4,
      });

      // Add prescribed sets to all exercises
      for (const week of originalProgram.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 3);
          }
        }
      }

      // Add required metadata
      await prisma.program.update({
        where: { id: originalProgram.id },
        data: {
          level: 'intermediate',
          goals: ['strength'],
        },
      });

      const publishResult = await publishProgramToCommunity(
        prisma,
        originalProgram.id,
        userId,
        'strength'
      );
      expect(publishResult.success).toBe(true);

      // Act: Clone the program (publishes to BullMQ queue)
      const cloneResult = await cloneCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        otherUserId
      );

      expect(cloneResult.success).toBe(true);
      expect(cloneResult.programId).toBeDefined();

      // Verify shell program was created with copyStatus='cloning'
      const shellProgram = await prisma.program.findUnique({
        where: { id: cloneResult.programId },
      });
      expect(shellProgram).toBeTruthy();
      expect(shellProgram!.copyStatus).toBe('cloning');
      expect(shellProgram!.userId).toBe(otherUserId);

      // Wait for the BullMQ worker to process the job
      // The cloneCommunityProgram already enqueued via publishProgramCloneJob
      // but our test worker is running, so we just need to wait for completion
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          const program = await prisma.program.findUnique({
            where: { id: cloneResult.programId },
          });
          if (program && program.copyStatus !== 'cloning' && !program.copyStatus?.startsWith('cloning_week')) {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 200);

        // Safety timeout
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(undefined);
        }, 15000);
      });

      // Assert: Verify cloned program is complete
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
      expect(clonedProgram!.copyStatus).toBe('ready');
      expect(clonedProgram!.name).toBe('Test Strength Program (Community)');
      expect(clonedProgram!.userId).toBe(otherUserId);
      expect(clonedProgram!.isActive).toBe(false);

      // Verify structure: 2 weeks
      expect(clonedProgram!.weeks.length).toBe(2);

      // Verify first week: 3 workouts
      expect(clonedProgram!.weeks[0].workouts.length).toBe(3);

      // Verify first workout: 4 exercises
      expect(clonedProgram!.weeks[0].workouts[0].exercises.length).toBe(4);

      // Verify first exercise: 3 prescribed sets
      expect(
        clonedProgram!.weeks[0].workouts[0].exercises[0].prescribedSets.length
      ).toBe(3);

      // Total counts
      const totalWorkouts = clonedProgram!.weeks.reduce(
        (sum, w) => sum + w.workouts.length,
        0
      );
      expect(totalWorkouts).toBe(6); // 2 weeks * 3 workouts

      const totalExercises = clonedProgram!.weeks.reduce(
        (sum, w) =>
          sum + w.workouts.reduce((s, wo) => s + wo.exercises.length, 0),
        0
      );
      expect(totalExercises).toBe(24); // 6 workouts * 4 exercises
    }, 30000);

    it('should handle progressive cloning with per-week status updates', async () => {
      // Arrange: Create program with 3 weeks
      const originalProgram = await createTestProgram(prisma, userId, {
        name: 'Multi-Week Program',
        weeks: 3,
        workoutsPerWeek: 2,
        exercisesPerWorkout: 2,
      });

      for (const week of originalProgram.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 2);
          }
        }
      }

      // Add required metadata
      await prisma.program.update({
        where: { id: originalProgram.id },
        data: {
          level: 'intermediate',
          goals: ['strength'],
        },
      });

      const publishResult = await publishProgramToCommunity(
        prisma,
        originalProgram.id,
        userId,
        'strength'
      );

      const cloneResult = await cloneCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        otherUserId
      );

      // Wait for processing to complete
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          const program = await prisma.program.findUnique({
            where: { id: cloneResult.programId },
          });
          if (program && program.copyStatus === 'ready') {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 200);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(undefined);
        }, 15000);
      });

      // Assert: Verify final status is 'ready'
      const finalProgram = await prisma.program.findUnique({
        where: { id: cloneResult.programId },
      });

      expect(finalProgram!.copyStatus).toBe('ready');
    }, 30000);
  });

  describe('Cardio Program Cloning', () => {
    it('should clone a cardio program with all sessions', async () => {
      // Arrange: Create and publish a cardio program
      const cardioProgram = await prisma.cardioProgram.create({
        data: {
          name: 'Test Cardio Program',
          description: 'Cardio test',
          userId,
          isActive: false,
          weeks: {
            create: [
              {
                weekNumber: 1,
                userId,
                sessions: {
                  create: [
                    {
                      dayNumber: 1,
                      name: 'Easy Run',
                      targetDuration: 30,
                      intensityZone: 'Zone 2',
                      userId,
                    },
                    {
                      dayNumber: 3,
                      name: 'Tempo Run',
                      targetDuration: 45,
                      intensityZone: 'Zone 3',
                      userId,
                    },
                  ],
                },
              },
              {
                weekNumber: 2,
                userId,
                sessions: {
                  create: [
                    {
                      dayNumber: 2,
                      name: 'Long Run',
                      targetDuration: 60,
                      intensityZone: 'Zone 2',
                      userId,
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      // Publish to community
      const fullCardioProgram = await prisma.cardioProgram.findUnique({
        where: { id: cardioProgram.id },
        include: {
          weeks: {
            include: {
              sessions: true,
            },
          },
        },
      });

      const communityProgram = await prisma.communityProgram.create({
        data: {
          name: fullCardioProgram!.name,
          description: fullCardioProgram!.description!,
          programType: 'cardio',
          authorUserId: userId,
          originalProgramId: cardioProgram.id,
          displayName: 'Test Author',
          weekCount: 2,
          workoutCount: 0,
          exerciseCount: 0,
          programData: {
            weeks: fullCardioProgram!.weeks.map((w) => ({
              weekNumber: w.weekNumber,
              sessions: w.sessions.map((s) => ({
                dayNumber: s.dayNumber,
                name: s.name,
                targetDuration: s.targetDuration,
                intensityZone: s.intensityZone,
                description: s.description,
                equipment: s.equipment,
                targetHRRange: s.targetHRRange,
                targetPowerRange: s.targetPowerRange,
                intervalStructure: s.intervalStructure,
                notes: s.notes,
              })),
            })),
          },
        },
      });

      // Act: Clone the cardio program
      const cloneResult = await cloneCommunityProgram(
        prisma,
        communityProgram.id,
        otherUserId
      );

      expect(cloneResult.success).toBe(true);

      // Wait for processing to complete
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          const program = await prisma.cardioProgram.findUnique({
            where: { id: cloneResult.programId },
          });
          if (program && program.copyStatus === 'ready') {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 200);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(undefined);
        }, 15000);
      });

      // Assert: Verify cloned cardio program
      const clonedCardioProgram = await prisma.cardioProgram.findUnique({
        where: { id: cloneResult.programId },
        include: {
          weeks: {
            include: {
              sessions: true,
            },
          },
        },
      });

      expect(clonedCardioProgram).toBeTruthy();
      expect(clonedCardioProgram!.copyStatus).toBe('ready');
      expect(clonedCardioProgram!.userId).toBe(otherUserId);
      expect(clonedCardioProgram!.weeks.length).toBe(2);

      // Verify sessions
      const totalSessions = clonedCardioProgram!.weeks.reduce(
        (sum, w) => sum + w.sessions.length,
        0
      );
      expect(totalSessions).toBe(3);

      // Verify specific session details
      const firstSession = clonedCardioProgram!.weeks[0].sessions[0];
      expect(firstSession.name).toBe('Easy Run');
      expect(firstSession.targetDuration).toBe(30);
      expect(firstSession.intensityZone).toBe('Zone 2');
    }, 30000);
  });

  describe('Idempotency', () => {
    it('should mark program as ready if all weeks already exist (retry scenario)', async () => {
      // Arrange: Create and publish a program
      const originalProgram = await createTestProgram(prisma, userId, {
        weeks: 2,
        workoutsPerWeek: 2,
        exercisesPerWorkout: 2,
      });

      for (const week of originalProgram.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 2);
          }
        }
      }

      // Add required metadata
      await prisma.program.update({
        where: { id: originalProgram.id },
        data: {
          level: 'intermediate',
          goals: ['strength'],
        },
      });

      const publishResult = await publishProgramToCommunity(
        prisma,
        originalProgram.id,
        userId,
        'strength'
      );

      const cloneResult = await cloneCommunityProgram(
        prisma,
        publishResult.communityProgramId!,
        otherUserId
      );

      // Wait for first processing
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          const program = await prisma.program.findUnique({
            where: { id: cloneResult.programId },
          });
          if (program && program.copyStatus === 'ready') {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 200);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(undefined);
        }, 15000);
      });

      // Verify it's marked ready
      const programAfterFirstClone = await prisma.program.findUnique({
        where: { id: cloneResult.programId },
        include: { weeks: true },
      });
      expect(programAfterFirstClone!.copyStatus).toBe('ready');
      expect(programAfterFirstClone!.weeks.length).toBe(2);

      // Act: Simulate retry - set status back to 'cloning' and call worker again
      await prisma.program.update({
        where: { id: cloneResult.programId },
        data: { copyStatus: 'cloning' },
      });

      // Fetch programData for retry
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { id: publishResult.communityProgramId },
        select: { programData: true },
      });

      expect(communityProgram).toBeTruthy();

      // Call cloning function directly (simulates worker retry)
      await cloneStrengthProgramData(
        prisma as any,
        cloneResult.programId!,
        communityProgram!.programData as any,
        otherUserId
      );

      // Assert: Should still be marked ready, no duplicate weeks
      const programAfterRetry = await prisma.program.findUnique({
        where: { id: cloneResult.programId },
        include: { weeks: true },
      });

      expect(programAfterRetry!.copyStatus).toBe('ready');
      expect(programAfterRetry!.weeks.length).toBe(2); // No duplicates
    }, 30000);

    it('should mark program as failed if partial weeks exist (corrupted state)', async () => {
      // Arrange: Create and publish a program with 3 weeks
      const originalProgram = await createTestProgram(prisma, userId, {
        weeks: 3,
        workoutsPerWeek: 2,
        exercisesPerWorkout: 2,
      });

      for (const week of originalProgram.weeks) {
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            await createTestPrescribedSets(prisma, exercise.id, userId, 2);
          }
        }
      }

      // Add required metadata
      await prisma.program.update({
        where: { id: originalProgram.id },
        data: {
          level: 'intermediate',
          goals: ['strength'],
        },
      });

      const publishResult = await publishProgramToCommunity(
        prisma,
        originalProgram.id,
        userId,
        'strength'
      );

      // Create shell program manually
      const shellProgram = await prisma.program.create({
        data: {
          name: 'Test Program (Community)',
          description: originalProgram.description,
          userId: otherUserId,
          isActive: false,
          copyStatus: 'cloning',
          isUserCreated: true,
        },
      });

      // Manually create only 1 out of 3 weeks (simulate partial clone failure)
      await prisma.week.create({
        data: {
          weekNumber: 1,
          programId: shellProgram.id,
          userId: otherUserId,
        },
      });

      // Act: Attempt to clone with partial weeks already present
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { id: publishResult.communityProgramId },
        select: { programData: true },
      });

      // This should detect partial clone and mark as failed
      let error: any = null;
      try {
        await cloneStrengthProgramData(
          prisma as any,
          shellProgram.id,
          communityProgram!.programData as any,
          otherUserId
        );
      } catch (e) {
        error = e;
      }

      // Assert: Should throw error and mark program as failed
      expect(error).toBeTruthy();
      expect(error.message).toContain('Partial clone detected');

      const failedProgram = await prisma.program.findUnique({
        where: { id: shellProgram.id },
      });

      expect(failedProgram!.copyStatus).toBe('failed');
    }, 30000);
  });
});
