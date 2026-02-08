/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PubSub } from '@google-cloud/pubsub';
import { OAuth2Client } from 'google-auth-library';
import { getTestDatabase } from '@/lib/test/database';
import { startPubSubEmulator, stopPubSubEmulator } from '@/lib/test/pubsub-emulator';
import {
  createTestUser,
  createTestProgram,
  createTestPrescribedSets,
} from '@/lib/test/factories';
import { publishProgramToCommunity } from '@/lib/community/publishing';
import { cloneCommunityProgram } from '@/lib/community/cloning';
import { ProgramCloneJob } from '@/lib/gcp/pubsub';

// Import cloning functions from worker
import {
  cloneStrengthProgramData,
  cloneCardioProgramData,
} from '../../cloud-functions/clone-program/src/cloning';

describe('Program Cloning via Pub/Sub + Worker', () => {
  let prisma: PrismaClient;
  let pubsub: PubSub;
  let subscription: any;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    // Start both database and Pub/Sub emulator
    await startPubSubEmulator();

    // Set up Pub/Sub client
    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: 'emulator-test' });

    pubsub = new PubSub({
      projectId: process.env.PUBSUB_PROJECT_ID || 'test-project',
      authClient,
    });

    // Create topic and subscription BEFORE any tests run
    const topicName = 'program-clone-jobs';
    const subscriptionName = 'program-clone-jobs-sub';

    try {
      const [topic] = await pubsub.createTopic(topicName);
      [subscription] = await topic.createSubscription(subscriptionName);
      console.log('✅ Created Pub/Sub topic and subscription');
    } catch (error) {
      console.warn('Topic/subscription may already exist:', error);
    }
  }, 60000);

  afterAll(async () => {
    await stopPubSubEmulator();
  }, 10000);

  beforeEach(async () => {
    const testDb = await getTestDatabase();
    prisma = testDb.getPrismaClient();
    await testDb.reset();

    const user = await createTestUser();
    userId = user.id;

    const otherUser = await createTestUser();
    otherUserId = otherUser.id;
  });

  /**
   * Helper: Process the next Pub/Sub message for a specific programId
   * Filters out messages from other tests that may be in the queue
   */
  async function processNextCloneJob(expectedProgramId: string, timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      let messageHandler: ((message: any) => Promise<void>) | null = null;

      const timeout = setTimeout(() => {
        if (messageHandler) {
          subscription.removeListener('message', messageHandler);
        }
        reject(new Error(`No message received for program ${expectedProgramId} within timeout`));
      }, timeoutMs);

      messageHandler = async (message: any) => {
        try {
          // Parse the job from message data
          const data = message.data.toString();
          const job: ProgramCloneJob = JSON.parse(data);

          // Check if this is the message we're looking for
          if (job.programId !== expectedProgramId) {
            console.log(`⏭️  Skipping message for different program: ${job.programId}`);
            message.ack(); // Ack it so it doesn't get redelivered
            return; // Don't remove handler, keep listening
          }

          // This is our message!
          clearTimeout(timeout);
          subscription.removeListener('message', messageHandler!);

          console.log('📨 Processing clone job:', job);

          // Fetch programData from database (same as worker does)
          const communityProgram = await prisma.communityProgram.findUnique({
            where: { id: job.communityProgramId },
            select: { programData: true },
          });

          if (!communityProgram || !communityProgram.programData) {
            throw new Error('Community program not found');
          }

          const programData = communityProgram.programData as any;

          // Call the appropriate cloning function
          if (job.programType === 'cardio') {
            await cloneCardioProgramData(prisma as any, job.programId, programData, job.userId);
          } else {
            await cloneStrengthProgramData(prisma as any, job.programId, programData, job.userId);
          }

          message.ack();
          console.log('✅ Clone job processed successfully');
          resolve();
        } catch (error) {
          console.error('❌ Error processing clone job:', error);
          clearTimeout(timeout);
          subscription.removeListener('message', messageHandler!);
          message.nack();
          reject(error);
        }
      };

      subscription.on('message', messageHandler);
    });
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

      // Act: Clone the program (publishes Pub/Sub message)
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

      // Process the Pub/Sub message (simulates worker)
      await processNextCloneJob(cloneResult.programId!);

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

      // Act: Process the job
      await processNextCloneJob(cloneResult.programId!);

      // Assert: Verify final status is 'ready' (not 'cloning_week_3_of_3')
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

      // Process the Pub/Sub message
      await processNextCloneJob(cloneResult.programId!);

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

      // First processing - should succeed
      await processNextCloneJob(cloneResult.programId!);

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

      // Fetch programData for retry (community program still exists from earlier)
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { id: publishResult.communityProgramId },
        select: { programData: true },
      });

      expect(communityProgram).toBeTruthy();

      // Call cloning function directly (simulates worker retry without Pub/Sub)
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
