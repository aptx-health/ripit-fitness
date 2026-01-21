import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/cardio/stats
 * Get summary statistics for user's cardio sessions
 * Query params:
 *   - dateFrom: ISO date string (default: all time)
 *   - dateTo: ISO date string (default: now)
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
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const where: any = {
      userId: user.id,
      status: 'completed' // Only count completed sessions
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

    // Fetch all sessions for stats
    const sessions = await prisma.loggedCardioSession.findMany({
      where,
      select: {
        duration: true,
        distance: true,
        calories: true,
        avgHR: true,
        peakHR: true,
        equipment: true,
        intensityZone: true
      }
    })

    // Calculate aggregate stats
    const totalSessions = sessions.length
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0)
    const totalDistance = sessions.reduce((sum, s) => sum + (s.distance || 0), 0)
    const totalCalories = sessions.reduce((sum, s) => sum + (s.calories || 0), 0)

    // Calculate average HR (only from sessions that logged it)
    const hrSessions = sessions.filter(s => s.avgHR !== null)
    const avgHR = hrSessions.length > 0
      ? hrSessions.reduce((sum, s) => sum + (s.avgHR || 0), 0) / hrSessions.length
      : null

    // Calculate peak HR (max across all sessions)
    const peakHR = sessions.reduce((max, s) => {
      if (s.peakHR === null) return max
      return s.peakHR > max ? s.peakHR : max
    }, 0) || null

    // Equipment breakdown
    const equipmentBreakdown: Record<string, number> = {}
    sessions.forEach(s => {
      equipmentBreakdown[s.equipment] = (equipmentBreakdown[s.equipment] || 0) + 1
    })

    // Zone breakdown
    const zoneBreakdown: Record<string, number> = {}
    sessions.forEach(s => {
      if (s.intensityZone) {
        zoneBreakdown[s.intensityZone] = (zoneBreakdown[s.intensityZone] || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions,
        totalDuration,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalCalories,
        avgHR: avgHR ? Math.round(avgHR) : null,
        peakHR,
        equipmentBreakdown,
        zoneBreakdown
      }
    })
  } catch (error) {
    console.error('Error fetching cardio stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
