import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { COMMON_EQUIPMENT, SPECIALIZED_EQUIPMENT } from '@/lib/constants/program-metadata'
import {
  validateExerciseDefinition,
  normalizeExerciseName,
  type CreateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition'

/**
 * GET /api/admin/exercise-definitions
 * List all exercises with pagination, search, and filters
 *
 * Query params:
 * - query: Text search on name and aliases
 * - faus: Comma-separated FAU filters
 * - equipment: Comma-separated equipment filters
 * - isSystem: 'true' for system only, 'false' for user only, omit for all
 * - page: Page number (1-based), default 1
 * - limit: Results per page, default 50, max 100
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin check when admin system is built
    // const isAdmin = await checkUserIsAdmin(user.id)
    // if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const fauFilters = searchParams.get('faus')?.split(',').filter(Boolean) || []
    const equipmentFilters = searchParams.get('equipment')?.split(',').filter(Boolean) || []
    const isSystemParam = searchParams.get('isSystem')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100)

    logger.debug(
      { query, fauFilters, equipmentFilters, isSystemParam, page, limit },
      'Admin exercise search params'
    )

    // Build where conditions
    const whereConditions: Record<string, unknown>[] = []

    // Text search on name and aliases
    if (query.trim()) {
      const searchTerm = query.trim()
      whereConditions.push({
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            normalizedName: {
              contains: searchTerm.toLowerCase().replace(/[^a-z0-9]/g, ''),
              mode: 'insensitive',
            },
          },
          {
            aliases: {
              hasSome: [searchTerm.toLowerCase()],
            },
          },
        ],
      })
    }

    // Filter by FAUs (primary muscle groups)
    if (fauFilters.length > 0) {
      whereConditions.push({
        primaryFAUs: {
          hasSome: fauFilters,
        },
      })
    }

    // Filter by equipment (with "other" expansion)
    if (equipmentFilters.length > 0) {
      const expandedEquipmentFilters = equipmentFilters.flatMap((filter) => {
        const normalized = filter
          .replace('dumbbells', 'dumbbell')
          .replace('resistance band', 'resistance_band')

        if (normalized === 'other') {
          return Object.values(SPECIALIZED_EQUIPMENT)
        }
        return [normalized]
      })

      whereConditions.push({
        equipment: {
          hasSome: expandedEquipmentFilters,
        },
      })
    }

    // Filter by system/user
    if (isSystemParam === 'true') {
      whereConditions.push({ isSystem: true })
    } else if (isSystemParam === 'false') {
      whereConditions.push({ isSystem: false })
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {}

    // Get total count for pagination
    const totalCount = await prisma.exerciseDefinition.count({
      where: whereClause,
    })

    // Fetch exercises with pagination
    const exercises = await prisma.exerciseDefinition.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        normalizedName: true,
        aliases: true,
        primaryFAUs: true,
        secondaryFAUs: true,
        equipment: true,
        category: true,
        instructions: true,
        notes: true,
        isSystem: true,
        createdBy: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            exercises: true, // Usage count
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform to include canEdit and canDelete flags
    const exercisesWithFlags = exercises.map((exercise) => ({
      ...exercise,
      usageCount: exercise._count.exercises,
      canEdit: true, // Admin can edit all exercises
      canDelete: true, // Admin can delete all exercises
      _count: undefined,
    }))

    const totalPages = Math.ceil(totalCount / limit)

    logger.debug(
      { count: exercises.length, totalCount, page, totalPages },
      'Admin exercise search results'
    )

    return NextResponse.json({
      success: true,
      data: exercisesWithFlags,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error fetching admin exercise definitions')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/exercise-definitions
 * Create a new exercise definition (can create system exercises)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin check when admin system is built
    // const isAdmin = await checkUserIsAdmin(user.id)
    // if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const input: CreateExerciseDefinitionInput = {
      name: body.name,
      equipment: body.equipment || [],
      primaryFAUs: body.primaryFAUs || [],
      secondaryFAUs: body.secondaryFAUs || [],
      category: body.category,
      aliases: body.aliases || [],
      instructions: body.instructions,
      notes: body.notes,
    }

    // Validate input
    const validationErrors = validateExerciseDefinition(input, false)
    if (validationErrors.length > 0) {
      logger.debug({ validationErrors }, 'Admin validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 422 }
      )
    }

    // Check for duplicate name across all exercises
    const normalizedName = normalizeExerciseName(input.name)
    const duplicate = await prisma.exerciseDefinition.findFirst({
      where: { normalizedName },
      select: { id: true },
    })

    if (duplicate) {
      logger.debug({ name: input.name, duplicateId: duplicate.id }, 'Duplicate exercise name')
      return NextResponse.json(
        { error: 'An exercise with this name already exists' },
        { status: 409 }
      )
    }

    // Create exercise definition as system exercise
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
        isSystem: true, // Admin creates system exercises
        createdBy: user.id,
        userId: user.id, // Track who created it even for system exercises
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
    })

    logger.info(
      { exerciseId: exerciseDefinition.id, name: exerciseDefinition.name },
      'Admin exercise definition created'
    )

    return NextResponse.json({
      success: true,
      data: exerciseDefinition,
    })
  } catch (error) {
    logger.error({ error }, 'Error creating admin exercise definition')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
