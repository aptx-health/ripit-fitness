import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTestDatabase } from '@/lib/test/database';
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories';
import {
  buildTaggingPrompt,
  type ExerciseTagInput,
  type ExerciseTagResult,
  type LLMTagger,
  tagExercise,
  tagExercises,
  validateTagResult,
} from '@/lib/exercises/auto-tag';

describe('exercises/auto-tag', () => {
  describe('validateTagResult', () => {
    it('accepts valid labels', () => {
      const r = validateTagResult({
        id: 'abc',
        movementPattern: 'horizontal_push',
        intensityClass: 'heavy',
      });
      expect(r.movementPattern).toBe('horizontal_push');
      expect(r.intensityClass).toBe('heavy');
    });

    it('rejects unknown movementPattern', () => {
      expect(() =>
        validateTagResult({ id: 'a', movementPattern: 'bench', intensityClass: 'heavy' }),
      ).toThrow(/movementPattern/);
    });

    it('rejects unknown intensityClass', () => {
      expect(() =>
        validateTagResult({ id: 'a', movementPattern: 'squat', intensityClass: 'crushing' }),
      ).toThrow(/intensityClass/);
    });
  });

  describe('buildTaggingPrompt', () => {
    it('includes the exercise name, allowed labels, and id', () => {
      const prompt = buildTaggingPrompt([
        { id: 'x1', name: 'Back Squat', primaryFAUs: ['quads'] },
      ]);
      expect(prompt).toContain('Back Squat');
      expect(prompt).toContain('id=x1');
      expect(prompt).toContain('squat');
      expect(prompt).toContain('heavy');
      expect(prompt).toContain('moderate');
    });
  });

  describe('tagExercises (DB)', () => {
    let prisma: PrismaClient;

    beforeEach(async () => {
      const testDb = await getTestDatabase();
      prisma = testDb.getPrismaClient();
      await testDb.reset();
    });

    it('writes movementPattern, intensityClass, taggedAt, taggedBy', async () => {
      const user = await createTestUser();
      const def = await createTestExerciseDefinition(prisma, {
        name: 'Back Squat',
        userId: user.id,
        isSystem: false,
      });

      const llm: LLMTagger = {
        modelId: 'mock-model-v1',
        tag: vi.fn(async (exs: ExerciseTagInput[]): Promise<ExerciseTagResult[]> =>
          exs.map((e) => ({
            id: e.id,
            movementPattern: 'squat',
            intensityClass: 'heavy',
          })),
        ),
      };

      await tagExercise(def.id, { llm, db: prisma });

      const updated = await prisma.exerciseDefinition.findUnique({ where: { id: def.id } });
      expect(updated?.movementPattern).toBe('squat');
      expect(updated?.intensityClass).toBe('heavy');
      expect(updated?.taggedBy).toBe('mock-model-v1');
      expect(updated?.taggedAt).toBeInstanceOf(Date);
      expect(llm.tag).toHaveBeenCalledOnce();
    });

    it('batches multiple ids into a single LLM call', async () => {
      const user = await createTestUser();
      const a = await createTestExerciseDefinition(prisma, {
        name: 'Deadlift',
        userId: user.id,
        isSystem: false,
      });
      const b = await createTestExerciseDefinition(prisma, {
        name: 'Overhead Press',
        userId: user.id,
        isSystem: false,
      });

      const tagFn = vi.fn(
        async (exs: ExerciseTagInput[]): Promise<ExerciseTagResult[]> =>
          exs.map((e) => ({
            id: e.id,
            movementPattern: e.name.includes('Deadlift') ? 'hinge' : 'vertical_push',
            intensityClass: 'heavy',
          })),
      );
      const llm: LLMTagger = { modelId: 'mock-model-v1', tag: tagFn };

      await tagExercises([a.id, b.id], { llm, db: prisma });

      expect(tagFn).toHaveBeenCalledOnce();
      const updatedA = await prisma.exerciseDefinition.findUnique({ where: { id: a.id } });
      const updatedB = await prisma.exerciseDefinition.findUnique({ where: { id: b.id } });
      expect(updatedA?.movementPattern).toBe('hinge');
      expect(updatedB?.movementPattern).toBe('vertical_push');
    });

    it('no-ops on empty input', async () => {
      const tagFn = vi.fn();
      await tagExercises([], { llm: { modelId: 'm', tag: tagFn }, db: prisma });
      expect(tagFn).not.toHaveBeenCalled();
    });

    it('throws (and does not write) when LLM returns invalid labels', async () => {
      const user = await createTestUser();
      const def = await createTestExerciseDefinition(prisma, {
        name: 'Curl',
        userId: user.id,
        isSystem: false,
      });

      const llm: LLMTagger = {
        modelId: 'mock-model-v1',
        tag: async (exs) =>
          exs.map((e) => ({
            id: e.id,
            // bogus label
            movementPattern: 'biceps' as never,
            intensityClass: 'light',
          })),
      };

      await expect(tagExercise(def.id, { llm, db: prisma })).rejects.toThrow(/movementPattern/);

      const after = await prisma.exerciseDefinition.findUnique({ where: { id: def.id } });
      expect(after?.movementPattern).toBeNull();
      expect(after?.taggedAt).toBeNull();
    });
  });
});
