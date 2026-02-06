import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase } from '@/lib/test/database';
import { createTestUser } from '@/lib/test/factories';
import {
  normalizeExerciseName,
  validateExerciseDefinition,
  checkDuplicateExercise,
  type CreateExerciseDefinitionInput,
  type UpdateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition';

describe('Exercise Definition Validation', () => {
  describe('normalizeExerciseName', () => {
    it('should convert to lowercase and trim', () => {
      expect(normalizeExerciseName('  Bench Press  ')).toBe('bench press');
      expect(normalizeExerciseName('SQUAT')).toBe('squat');
    });

    it('should remove special characters', () => {
      expect(normalizeExerciseName('Bench @ Press!')).toBe('bench press');
      expect(normalizeExerciseName('Dead-Lift')).toBe('dead-lift');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeExerciseName('Bench    Press')).toBe('bench press');
    });
  });

  describe('validateExerciseDefinition - Create', () => {
    it('should pass validation for valid input', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest', 'triceps'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toHaveLength(0);
    });

    it('should require name', () => {
      const input: CreateExerciseDefinitionInput = {
        name: '',
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'name',
        message: 'Name is required',
      });
    });

    it('should enforce max name length', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'a'.repeat(101),
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'name',
        message: 'Name must be 100 characters or less',
      });
    });

    it('should require at least one equipment', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: [],
        primaryFAUs: ['chest'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'equipment',
        message: 'At least one equipment type is required',
      });
    });

    it('should reject invalid equipment', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell', 'invalid_equipment'],
        primaryFAUs: ['chest'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors.some((e) => e.field === 'equipment')).toBe(true);
    });

    it('should require at least one primary FAU', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: [],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'primaryFAUs',
        message: 'At least one primary muscle group is required',
      });
    });

    it('should reject invalid primary FAUs', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest', 'invalid_muscle'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors.some((e) => e.field === 'primaryFAUs')).toBe(true);
    });

    it('should reject invalid secondary FAUs', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        secondaryFAUs: ['triceps', 'invalid_muscle'],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors.some((e) => e.field === 'secondaryFAUs')).toBe(true);
    });

    it('should enforce max aliases count', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        aliases: Array(11).fill('alias'),
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'aliases',
        message: 'Maximum 10 aliases allowed',
      });
    });

    it('should enforce max alias length', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        aliases: ['a'.repeat(51)],
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'aliases',
        message: 'Aliases must be 50 characters or less',
      });
    });

    it('should enforce max instructions length', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        instructions: 'a'.repeat(401),
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'instructions',
        message: 'Instructions must be 400 characters or less',
      });
    });

    it('should enforce max notes length', () => {
      const input: CreateExerciseDefinitionInput = {
        name: 'Bench Press',
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        notes: 'a'.repeat(401),
      };
      const errors = validateExerciseDefinition(input, false);
      expect(errors).toContainEqual({
        field: 'notes',
        message: 'Notes must be 400 characters or less',
      });
    });
  });

  describe('validateExerciseDefinition - Update', () => {
    it('should allow partial updates', () => {
      const input: UpdateExerciseDefinitionInput = {
        instructions: 'New instructions',
      };
      const errors = validateExerciseDefinition(input, true);
      expect(errors).toHaveLength(0);
    });

    it('should validate provided fields in updates', () => {
      const input: UpdateExerciseDefinitionInput = {
        name: '',
      };
      const errors = validateExerciseDefinition(input, true);
      expect(errors).toContainEqual({
        field: 'name',
        message: 'Name is required',
      });
    });
  });

  describe('checkDuplicateExercise', () => {
    let prisma: PrismaClient;
    let userId: string;

    beforeEach(async () => {
      const testDb = await getTestDatabase();
      prisma = testDb.getPrismaClient();
      await testDb.reset();

      const user = await createTestUser();
      userId = user.id;
    });

    it('should detect duplicate system exercise', async () => {
      await prisma.exerciseDefinition.create({
        data: {
          name: 'Bench Press',
          normalizedName: 'bench press',
          isSystem: true,
          userId,
          equipment: ['barbell'],
          primaryFAUs: ['chest'],
        },
      });

      const result = await checkDuplicateExercise(
        prisma,
        'Bench Press',
        userId
      );
      expect(result.exists).toBe(true);
      expect(result.exerciseId).toBeDefined();
    });

    it('should detect duplicate user exercise', async () => {
      const exercise = await prisma.exerciseDefinition.create({
        data: {
          name: 'Custom Exercise',
          normalizedName: 'custom exercise',
          isSystem: false,
          userId,
          equipment: ['dumbbell'],
          primaryFAUs: ['biceps'],
        },
      });

      const result = await checkDuplicateExercise(
        prisma,
        'Custom Exercise',
        userId
      );
      expect(result.exists).toBe(true);
      expect(result.exerciseId).toBe(exercise.id);
    });

    it('should be case-insensitive', async () => {
      await prisma.exerciseDefinition.create({
        data: {
          name: 'Squat',
          normalizedName: 'squat',
          isSystem: true,
          userId,
          equipment: ['barbell'],
          primaryFAUs: ['quads'],
        },
      });

      const result = await checkDuplicateExercise(prisma, 'SQUAT', userId);
      expect(result.exists).toBe(true);
    });

    it('should exclude specified ID in updates', async () => {
      const exercise = await prisma.exerciseDefinition.create({
        data: {
          name: 'Deadlift',
          normalizedName: 'deadlift',
          isSystem: false,
          userId,
          equipment: ['barbell'],
          primaryFAUs: ['hamstrings'],
        },
      });

      const result = await checkDuplicateExercise(
        prisma,
        'Deadlift',
        userId,
        exercise.id
      );
      expect(result.exists).toBe(false);
    });

    it('should return false for unique exercise', async () => {
      const result = await checkDuplicateExercise(
        prisma,
        'Unique Exercise',
        userId
      );
      expect(result.exists).toBe(false);
      expect(result.exerciseId).toBeUndefined();
    });
  });
});
