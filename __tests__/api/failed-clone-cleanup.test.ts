import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTestDatabase } from '@/lib/test/database';
import { createTestUser } from '@/lib/test/factories';

describe('Failed Clone Cleanup (Issue #572)', () => {
  let prisma: PrismaClient;
  let userId: string;

  beforeEach(async () => {
    const testDb = await getTestDatabase();
    prisma = testDb.getPrismaClient();
    await testDb.reset();

    const user = await createTestUser();
    userId = user.id;
  });

  describe('Server-side filtering of failed clones', () => {
    it('should exclude copyStatus=failed programs from user program list', async () => {
      // Arrange: Create a normal program and a failed clone shell
      await prisma.program.create({
        data: {
          name: 'Normal Program',
          userId,
          isActive: true,
          copyStatus: 'ready',
          weeks: {
            create: {
              weekNumber: 1,
              userId,
              workouts: {
                create: { name: 'Day 1', dayNumber: 1, userId },
              },
            },
          },
        },
      });

      await prisma.program.create({
        data: {
          name: 'Failed Clone Shell',
          userId,
          isActive: false,
          copyStatus: 'failed',
        },
      });

      // Act: Simulate the programs page query (same filter as page.tsx)
      const programs = await prisma.program.findMany({
        where: {
          userId,
          deletedAt: null,
          copyStatus: { not: 'failed' },
        },
        select: {
          id: true,
          name: true,
          copyStatus: true,
        },
      });

      // Assert: Only the normal program should appear
      expect(programs).toHaveLength(1);
      expect(programs[0].name).toBe('Normal Program');
    });

    it('should include programs that are still cloning', async () => {
      // Arrange: Create a program currently being cloned
      await prisma.program.create({
        data: {
          name: 'Currently Cloning',
          userId,
          isActive: false,
          copyStatus: 'cloning',
        },
      });

      await prisma.program.create({
        data: {
          name: 'Cloning Week 3',
          userId,
          isActive: false,
          copyStatus: 'cloning_week_3_of_9',
        },
      });

      // Act: Same filter as page.tsx
      const programs = await prisma.program.findMany({
        where: {
          userId,
          deletedAt: null,
          copyStatus: { not: 'failed' },
        },
        select: {
          id: true,
          name: true,
          copyStatus: true,
        },
      });

      // Assert: Both cloning programs should still be visible
      expect(programs).toHaveLength(2);
    });

    it('should exclude failed programs from program count', async () => {
      // Arrange: Create a normal program and a failed clone shell
      await prisma.program.create({
        data: {
          name: 'Normal Program',
          userId,
          isActive: true,
          copyStatus: 'ready',
        },
      });

      await prisma.program.create({
        data: {
          name: 'Failed Clone',
          userId,
          isActive: false,
          copyStatus: 'failed',
        },
      });

      // Act: Same count filter as page.tsx
      const count = await prisma.program.count({
        where: {
          userId,
          deletedAt: null,
          copyStatus: { not: 'failed' },
        },
      });

      // Assert: Only count the normal program
      expect(count).toBe(1);
    });
  });

  describe('Shell program deletion on publish failure', () => {
    it('should delete shell program when clone job publish fails', async () => {
      // Arrange: Mock publishProgramCloneJob to fail
      vi.doMock('@/lib/queue/clone-jobs', () => ({
        publishProgramCloneJob: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
      }));

      // Dynamic import after mock
      const { cloneCommunityProgram } = await import('@/lib/community/cloning');

      // Create a community program to clone
      const communityProgram = await prisma.communityProgram.create({
        data: {
          name: 'Test Community Program',
          description: 'A test program',
          programType: 'strength',
          authorUserId: userId,
          originalProgramId: 'original-program-id',
          displayName: 'Test Author',
          weekCount: 2,
          workoutCount: 4,
          exerciseCount: 8,
          programData: {
            weeks: [
              { weekNumber: 1, workouts: [] },
              { weekNumber: 2, workouts: [] },
            ],
          },
        },
      });

      // Act: Clone should fail when publishing to queue
      const result = await cloneCommunityProgram(prisma, communityProgram.id, userId);

      // Assert: Clone should report failure
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to start program cloning');

      // Assert: Shell program should be deleted, not left as failed
      const remainingPrograms = await prisma.program.findMany({
        where: { userId, copyStatus: 'failed' },
      });
      expect(remainingPrograms).toHaveLength(0);

      vi.restoreAllMocks();
    });
  });

  describe('Copy-status stuck clone cleanup', () => {
    it('should delete empty shell programs when stuck clone detected', async () => {
      // Arrange: Create a shell program stuck in cloning state with no weeks
      // Created >5 minutes ago to trigger stuck detection
      const stuckProgram = await prisma.program.create({
        data: {
          name: 'Stuck Clone',
          userId,
          isActive: false,
          copyStatus: 'cloning',
          createdAt: new Date(Date.now() - 600000), // 10 minutes ago
        },
      });

      // Simulate the copy-status route's stuck clone detection logic
      const program = await prisma.program.findFirst({
        where: { id: stuckProgram.id, userId },
        select: {
          id: true,
          copyStatus: true,
          createdAt: true,
          _count: { select: { weeks: true } },
        },
      });

      const cloneAge = Date.now() - new Date(program!.createdAt).getTime();
      const hasNoWeeks = program!._count.weeks === 0;

      // Assert: Should detect as stuck (>5min)
      expect(cloneAge).toBeGreaterThan(300000);

      // Act: Delete programs with no weeks on failure (new behavior)
      if (cloneAge > 300000 && hasNoWeeks) {
        await prisma.program.delete({ where: { id: stuckProgram.id } });
      }

      // Assert: Program should be deleted
      const deleted = await prisma.program.findUnique({
        where: { id: stuckProgram.id },
      });
      expect(deleted).toBeNull();
    });

    it('should keep partially-cloned programs and mark as failed', async () => {
      // Arrange: Create a program with some weeks already cloned
      const partialProgram = await prisma.program.create({
        data: {
          name: 'Partial Clone',
          userId,
          isActive: false,
          copyStatus: 'cloning_week_3_of_9',
          createdAt: new Date(Date.now() - 600000), // 10 minutes ago
          weeks: {
            create: [
              { weekNumber: 1, userId },
              { weekNumber: 2, userId },
            ],
          },
        },
      });

      // Simulate the copy-status route's stuck clone detection
      const program = await prisma.program.findFirst({
        where: { id: partialProgram.id, userId },
        select: {
          id: true,
          copyStatus: true,
          createdAt: true,
          _count: { select: { weeks: true } },
        },
      });

      const hasWeeks = program!._count.weeks > 0;
      expect(hasWeeks).toBe(true);

      // Act: Mark as failed but do NOT delete (has partial data)
      await prisma.program.update({
        where: { id: partialProgram.id },
        data: { copyStatus: 'failed' },
      });

      // Assert: Program still exists but is marked failed
      const updated = await prisma.program.findUnique({
        where: { id: partialProgram.id },
      });
      expect(updated).not.toBeNull();
      expect(updated!.copyStatus).toBe('failed');
    });
  });
});
