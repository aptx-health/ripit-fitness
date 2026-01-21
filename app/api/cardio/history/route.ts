import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/cardio/history
 * Get user's logged cardio sessions
 * Query params:
 *   - limit: number (default: 50, max: 200)
 *   - offset: number (default: 0)
 *   - equipment: string (filter by equipment)
 *   - dateFrom: ISO date string
 *   - dateTo: ISO date string
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const equipment = searchParams.get('equipment')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const where: any = {
      userId: user.id
    }

    if (equipment) {
      where.equipment = equipment
    }

    if (dateFrom || dateTo) {
      where.completedAt = {}
      if (dateFrom) {
        where.completedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.completedAt.lte = new Date(dateTo)
      }
    }

    // Fetch sessions
    const [sessions, total] = await Promise.all([
      prisma.loggedCardioSession.findMany({
        where,
        orderBy: {
          completedAt: 'desc'
        },
        take: limit,
        skip: offset,
        include: {
          prescribedSession: {
            select: {
              id: true,
              name: true,
              targetDuration: true,
              intensityZone: true
            }
          }
        }
      }),
      prisma.loggedCardioSession.count({ where })
    ])

    return NextResponse.json({
      success: true,
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching cardio history:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
