import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

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
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                exercises: {
                  include: {
                    prescribedSets: true
                  }
                }
              }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      program
    })
  } catch (error) {
    console.error('Error creating program:', error)
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

    // Fetch user's programs (exclude archived)
    const programs = await prisma.program.findMany({
      where: {
        userId: user.id,
        isArchived: false,
        ...(userCreatedOnly && { isUserCreated: true })
      },
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                exercises: {
                  include: {
                    prescribedSets: true,
                    exerciseDefinition: true
                  }
                }
              }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
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
    console.error('Error fetching programs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}