import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/programs/[programId]/weeks/[weekNumber]
 * Fetch a single week's data for the program builder (lazy loading)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; weekNumber: string }> }
) {
  try {
    const { programId, weekNumber: weekNumberStr } = await params
    const weekNumber = parseInt(weekNumberStr, 10)

    if (isNaN(weekNumber) || weekNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid week number' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the week with all its data
    const week = await prisma.week.findFirst({
      where: {
        programId,
        weekNumber,
        userId: user.id
      },
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: {
                  orderBy: { setNumber: 'asc' }
                },
                exerciseDefinition: {
                  select: {
                    id: true,
                    name: true,
                    primaryFAUs: true,
                    secondaryFAUs: true,
                    isSystem: true,
                    createdBy: true
                  }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    if (!week) {
      return NextResponse.json(
        { error: 'Week not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      week
    })
  } catch (error) {
    console.error('Error fetching week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
