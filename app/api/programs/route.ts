import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  checkRateLimitWithHeaders,
  programManagementLimiter,
  withRateLimitHeaders,
} from '@/lib/rate-limit'

const MAX_CUSTOM_PROGRAMS = 3

type CreateProgramRequest = {
  name: string
  description?: string
  programType?: 'strength' | 'hypertrophy' | 'powerlifting'
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimitWithHeaders(programManagementLimiter, user.id, {
      endpoint: 'POST /api/programs',
    })
    if (rl.response) return rl.response

    // Check custom program limit (unless admin or bypass enabled)
    const isAdmin = user.role === 'admin'
    let bypassLimit = isAdmin

    if (!bypassLimit) {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { customProgramLimitBypass: true },
      })
      bypassLimit = settings?.customProgramLimitBypass ?? false
    }

    if (!bypassLimit) {
      const customProgramCount = await prisma.program.count({
        where: {
          userId: user.id,
          isUserCreated: true,
          deletedAt: null,
        },
      })

      if (customProgramCount >= MAX_CUSTOM_PROGRAMS) {
        return NextResponse.json(
          {
            error: 'Custom program limit reached',
            code: 'PROGRAM_LIMIT_REACHED',
            limit: MAX_CUSTOM_PROGRAMS,
            current: customProgramCount,
          },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await request.json() as CreateProgramRequest
    const { name, description, programType = 'strength' } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Program name is required' },
        { status: 400 }
      )
    }

    // Create program with isUserCreated = true
    const program = await prisma.program.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        programType,
        isUserCreated: true,
        userId: user.id,
        isActive: false, // User can activate it later
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        copyStatus: true,
        weeks: {
          select: { id: true, weekNumber: true },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        program,
      }),
      rl
    )
  } catch (error) {
    logger.error({ error, context: 'program-create' }, 'Failed to create program')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userCreatedOnly = searchParams.get('userCreated') === 'true'

    // Fetch user's programs (exclude archived and soft-deleted)
    const programs = await prisma.program.findMany({
      where: {
        userId: user.id,
        isArchived: false,
        deletedAt: null,
        ...(userCreatedOnly && { isUserCreated: true })
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        copyStatus: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      programs
    })
  } catch (error) {
    logger.error({ error, context: 'programs-list' }, 'Failed to fetch programs')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
