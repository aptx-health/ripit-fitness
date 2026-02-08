import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getCardioProgramCompletionStats } from '@/lib/db/program-completion'
import { logger } from '@/lib/logger'

/**
 * GET /api/cardio/programs/[id]/completion-stats
 * Get detailed completion statistics for celebration modal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardioProgramId } = await params

    logger.debug({ cardioProgramId }, 'Fetching cardio program completion stats')

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.debug({ cardioProgramId, authError }, 'Unauthorized request to fetch cardio stats')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.debug({ cardioProgramId, userId: user.id }, 'User authenticated, fetching stats')

    // Get completion stats
    const stats = await getCardioProgramCompletionStats(prisma, cardioProgramId, user.id)

    logger.debug({ cardioProgramId, userId: user.id, stats }, 'Cardio program completion stats retrieved')

    return NextResponse.json({
      data: {
        programName: stats.programName,
        startDate: stats.startDate?.toISOString(),
        endDate: stats.endDate?.toISOString(),
        totalDays: stats.durationDays,
        totalWorkouts: stats.totalWorkouts,
        completedWorkouts: stats.completedWorkouts,
        skippedWorkouts: stats.skippedWorkouts,
        totalDuration: stats.totalDuration,
        totalDistance: stats.totalDistance,
        totalSessions: stats.totalSessions,
      }
    })
  } catch (error) {
    logger.error({ error, cardioProgramId: (await params).id }, 'Error fetching cardio program completion stats')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
