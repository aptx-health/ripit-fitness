import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  validateExerciseDefinition,
  checkDuplicateExercise,
  normalizeExerciseName,
  type UpdateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition'

/**
 * GET /api/admin/exercise-definitions/[id]
 * Fetch exercise definition for editing (no ownership check)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin check when admin system is built
    // const isAdmin = await checkUserIsAdmin(user.id)
    // if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    logger.debug({ userId: user.id, exerciseId: id }, 'Admin fetching exercise definition')

    const exerciseDefinition = await prisma.exerciseDefinition.findUnique({
      where: { id },
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
        _count: {
          select: {
            exercises: true,
          },
        },
      },
    })

    if (!exerciseDefinition) {
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      )
    }

    logger.debug(
      { exerciseId: id, usageCount: exerciseDefinition._count.exercises },
      'Admin exercise definition fetched'
    )

    return NextResponse.json({
      success: true,
      data: {
        ...exerciseDefinition,
        usageCount: exerciseDefinition._count.exercises,
        canEdit: true,
        canDelete: true,
        _count: undefined,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error fetching admin exercise definition')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/exercise-definitions/[id]
 * Update any exercise (including system) - no ownership checks
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin check when admin system is built
    // const isAdmin = await checkUserIsAdmin(user.id)
    // if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    logger.debug({ userId: user.id, exerciseId: id }, 'Admin updating exercise definition')

    // Verify exercise exists
    const existing = await prisma.exerciseDefinition.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isSystem: true,
        userId: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const input: UpdateExerciseDefinitionInput = {
      name: body.name,
      equipment: body.equipment,
      primaryFAUs: body.primaryFAUs,
      secondaryFAUs: body.secondaryFAUs,
      category: body.category,
      aliases: body.aliases,
      instructions: body.instructions,
      notes: body.notes,
    }

    // Validate input
    const validationErrors = validateExerciseDefinition(input, true)
    if (validationErrors.length > 0) {
      logger.debug({ validationErrors }, 'Admin validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 422 }
      )
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== existing.name) {
      // For admin, check duplicates across all exercises (system included)
      const normalizedName = normalizeExerciseName(input.name)
      const duplicate = await prisma.exerciseDefinition.findFirst({
        where: {
          normalizedName,
          NOT: { id },
        },
        select: { id: true },
      })

      if (duplicate) {
        logger.debug({ name: input.name, duplicateId: duplicate.id }, 'Duplicate exercise name')
        return NextResponse.json(
          { error: 'An exercise with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (input.name !== undefined) {
      updateData.name = input.name
      updateData.normalizedName = normalizeExerciseName(input.name)
    }
    if (input.equipment !== undefined) updateData.equipment = input.equipment
    if (input.primaryFAUs !== undefined) updateData.primaryFAUs = input.primaryFAUs
    if (input.secondaryFAUs !== undefined) updateData.secondaryFAUs = input.secondaryFAUs
    if (input.category !== undefined) updateData.category = input.category
    if (input.aliases !== undefined) updateData.aliases = input.aliases
    if (input.instructions !== undefined) updateData.instructions = input.instructions
    if (input.notes !== undefined) updateData.notes = input.notes

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
    })

    logger.info({ exerciseId: id, name: updated.name }, 'Admin exercise definition updated')

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error({ error }, 'Error updating admin exercise definition')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/exercise-definitions/[id]
 * Delete any exercise (including system) - no ownership checks
 *
 * Query params:
 * - force: 'true' to delete even if exercise is in use
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin check when admin system is built
    // const isAdmin = await checkUserIsAdmin(user.id)
    // if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    logger.debug({ userId: user.id, exerciseId: id, force }, 'Admin deleting exercise definition')

    // Verify exercise exists
    const existing = await prisma.exerciseDefinition.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isSystem: true,
        _count: {
          select: {
            exercises: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      )
    }

    const usageCount = existing._count.exercises

    // If exercise is in use and force is not set, reject
    if (usageCount > 0 && !force) {
      return NextResponse.json(
        {
          error: 'Exercise is in use',
          usageCount,
          message: `This exercise is used ${usageCount} time${usageCount > 1 ? 's' : ''}. Use force=true to delete anyway.`,
        },
        { status: 409 }
      )
    }

    // Delete exercise definition
    // Note: This will fail if there are foreign key constraints
    // In that case, we may need to cascade delete or unlink exercises first
    await prisma.exerciseDefinition.delete({
      where: { id },
    })

    logger.info(
      { exerciseId: id, name: existing.name, wasSystem: existing.isSystem, usageCount },
      'Admin exercise definition deleted'
    )

    return NextResponse.json({
      success: true,
      message: 'Exercise definition deleted successfully',
    })
  } catch (error) {
    logger.error({ error }, 'Error deleting admin exercise definition')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
