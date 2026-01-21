import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/cardio/programs
 * Get all cardio programs for the user (including archived)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Build where clause
    const where: any = {
      userId: user.id
    }

    if (!includeArchived) {
      where.isArchived = false
    }

    // Fetch programs
    const programs = await prisma.cardioProgram.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayNumber: 'asc' }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      programs
    })
  } catch (error) {
    console.error('Error fetching cardio programs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cardio/programs
 * Create a new cardio program
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Program name is required' },
        { status: 400 }
      )
    }

    // Create program
    const program = await prisma.cardioProgram.create({
      data: {
        userId: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        isUserCreated: true,
        isActive: false
      },
      include: {
        weeks: true
      }
    })

    return NextResponse.json({
      success: true,
      program
    })
  } catch (error) {
    console.error('Error creating cardio program:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
