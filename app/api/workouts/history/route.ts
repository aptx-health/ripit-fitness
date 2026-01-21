import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get limit from query params (default to 5, max 20)
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    // Fetch recent workout completions with all necessary data
    const completions = await prisma.workoutCompletion.findMany({
      where: {
        userId: user.id,
        status: { in: ['completed', 'draft'] }
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        completedAt: true,
        workout: {
          select: {
            id: true,
            name: true,
            week: {
              select: {
                program: {
                  select: { name: true }
                }
              }
            }
          }
        },
        loggedSets: {
          select: {
            id: true,
            setNumber: true,
            reps: true,
            weight: true,
            weightUnit: true,
            exercise: {
              select: {
                name: true,
                exerciseGroup: true,
                order: true
              }
            }
          }
        },
        _count: {
          select: { loggedSets: true }
        }
      }
    })

    return NextResponse.json({ completions })
  } catch (error) {
    console.error('Error fetching workout history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
