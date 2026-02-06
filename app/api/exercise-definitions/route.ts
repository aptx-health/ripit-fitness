import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  validateExerciseDefinition,
  checkDuplicateExercise,
  normalizeExerciseName,
  type CreateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition';

/**
 * POST /api/exercise-definitions
 * Create a new custom exercise definition
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      logger.debug('Unauthorized - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.debug({ userId: user.id }, 'User authenticated');

    const body = await request.json();
    const input: CreateExerciseDefinitionInput = {
      name: body.name,
      equipment: body.equipment || [],
      primaryFAUs: body.primaryFAUs || [],
      secondaryFAUs: body.secondaryFAUs || [],
      category: body.category,
      aliases: body.aliases || [],
      instructions: body.instructions,
      notes: body.notes,
    };

    // Validate input
    const validationErrors = validateExerciseDefinition(input, false);
    if (validationErrors.length > 0) {
      logger.debug({ validationErrors }, 'Validation failed');
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 422 }
      );
    }

    // Check for duplicate name
    const duplicate = await checkDuplicateExercise(
      prisma,
      input.name,
      user.id
    );

    if (duplicate.exists) {
      logger.debug({ name: input.name, duplicateId: duplicate.exerciseId }, 'Duplicate exercise name');
      return NextResponse.json(
        { error: 'An exercise with this name already exists' },
        { status: 409 }
      );
    }

    // Create exercise definition
    const normalizedName = normalizeExerciseName(input.name);
    const exerciseDefinition = await prisma.exerciseDefinition.create({
      data: {
        name: input.name,
        normalizedName,
        equipment: input.equipment,
        primaryFAUs: input.primaryFAUs,
        secondaryFAUs: input.secondaryFAUs || [],
        category: input.category,
        aliases: input.aliases || [],
        instructions: input.instructions,
        notes: input.notes,
        isSystem: false,
        createdBy: user.id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        equipment: true,
        primaryFAUs: true,
        secondaryFAUs: true,
        category: true,
        aliases: true,
        instructions: true,
        notes: true,
        isSystem: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(
      { exerciseId: exerciseDefinition.id, name: exerciseDefinition.name },
      'Exercise definition created'
    );

    return NextResponse.json({
      success: true,
      data: exerciseDefinition,
    });
  } catch (error) {
    logger.error({ error }, 'Error creating exercise definition');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
