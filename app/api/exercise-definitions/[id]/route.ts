import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  validateExerciseDefinition,
  checkDuplicateExercise,
  normalizeExerciseName,
  type UpdateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition';

/**
 * GET /api/exercise-definitions/[id]
 * Fetch exercise definition with canEdit flag and usage count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      logger.debug('Unauthorized - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.debug({ userId: user.id, exerciseId: id }, 'Fetching exercise definition');

    // Fetch exercise definition
    const exerciseDefinition = await prisma.exerciseDefinition.findFirst({
      where: {
        id,
        OR: [{ isSystem: true }, { userId: user.id }],
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
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!exerciseDefinition) {
      logger.debug({ exerciseId: id }, 'Exercise definition not found');
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      );
    }

    // Determine if user can edit (only if it's their custom exercise)
    const canEdit =
      !exerciseDefinition.isSystem && exerciseDefinition.userId === user.id;

    // Calculate usage count (exercises in active workouts)
    const usageCount = await prisma.exercise.count({
      where: {
        exerciseDefinitionId: id,
        userId: user.id,
        workout: {
          week: {
            program: {
              isArchived: false,
            },
          },
        },
      },
    });

    logger.debug(
      { exerciseId: id, canEdit, usageCount },
      'Exercise definition fetched'
    );

    return NextResponse.json({
      success: true,
      data: {
        ...exerciseDefinition,
        canEdit,
        usageCount,
      },
    });
  } catch (error) {
    logger.error({ error, exerciseId: (await params).id }, 'Error fetching exercise definition');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/exercise-definitions/[id]
 * Update an existing custom exercise definition
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      logger.debug('Unauthorized - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.debug({ userId: user.id, exerciseId: id }, 'Updating exercise definition');

    // Verify exercise exists and user can edit it
    const existing = await prisma.exerciseDefinition.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isSystem: true,
        userId: true,
      },
    });

    if (!existing) {
      logger.debug({ exerciseId: id }, 'Exercise definition not found');
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      );
    }

    if (existing.isSystem) {
      logger.debug({ exerciseId: id }, 'Cannot edit system exercise');
      return NextResponse.json(
        { error: 'Cannot edit system exercise definitions' },
        { status: 403 }
      );
    }

    if (existing.userId !== user.id) {
      logger.debug({ exerciseId: id, userId: user.id }, 'User does not own exercise');
      return NextResponse.json(
        { error: 'You do not have permission to edit this exercise' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const input: UpdateExerciseDefinitionInput = {
      name: body.name,
      equipment: body.equipment,
      primaryFAUs: body.primaryFAUs,
      secondaryFAUs: body.secondaryFAUs,
      category: body.category,
      aliases: body.aliases,
      instructions: body.instructions,
      notes: body.notes,
    };

    // Validate input
    const validationErrors = validateExerciseDefinition(input, true);
    if (validationErrors.length > 0) {
      logger.debug({ validationErrors }, 'Validation failed');
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 422 }
      );
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== existing.name) {
      const duplicate = await checkDuplicateExercise(
        prisma,
        input.name,
        user.id,
        id
      );

      if (duplicate.exists) {
        logger.debug({ name: input.name, duplicateId: duplicate.exerciseId }, 'Duplicate exercise name');
        return NextResponse.json(
          { error: 'An exercise with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
      updateData.normalizedName = normalizeExerciseName(input.name);
    }
    if (input.equipment !== undefined) updateData.equipment = input.equipment;
    if (input.primaryFAUs !== undefined)
      updateData.primaryFAUs = input.primaryFAUs;
    if (input.secondaryFAUs !== undefined)
      updateData.secondaryFAUs = input.secondaryFAUs;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.aliases !== undefined) updateData.aliases = input.aliases;
    if (input.instructions !== undefined)
      updateData.instructions = input.instructions;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Update exercise definition
    const updated = await prisma.exerciseDefinition.update({
      where: { id },
      data: updateData,
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

    logger.info({ exerciseId: id, name: updated.name }, 'Exercise definition updated');

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error, exerciseId: (await params).id }, 'Error updating exercise definition');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
