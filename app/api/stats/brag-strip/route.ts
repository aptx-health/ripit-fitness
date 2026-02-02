import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/stats/brag-strip
 * Returns screenshot-friendly stats for sharing on social media
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

    // Calculate week boundaries (ISO week starts on Monday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Days since last Monday
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - daysUntilMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    // Calculate month boundary
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Run queries in parallel for performance
    const [
      workoutsThisWeek,
      workoutsThisMonth,
      workoutsAllTime,
      volumeData,
      runningData,
      earliestWorkout,
    ] = await Promise.all([
      // Workout counts this week (strength)
      prisma.workoutCompletion.count({
        where: {
          userId: user.id,
          status: 'completed',
          completedAt: { gte: startOfWeek },
        },
      }),

      // Workout counts this month (strength)
      prisma.workoutCompletion.count({
        where: {
          userId: user.id,
          status: 'completed',
          completedAt: { gte: startOfMonth },
        },
      }),

      // Workout counts all time (strength)
      prisma.workoutCompletion.count({
        where: {
          userId: user.id,
          status: 'completed',
        },
      }),

      // Total volume (from pre-aggregated performance log)
      prisma.exercisePerformanceLog.aggregate({
        where: {
          userId: user.id,
          type: 'strength',
        },
        _sum: {
          totalVolumeLbs: true,
        },
      }),

      // Running distance (treadmill + outdoor running only)
      prisma.exercisePerformanceLog.aggregate({
        where: {
          userId: user.id,
          type: 'cardio',
          equipment: {
            in: ['treadmill', 'outdoor_running'],
          },
        },
        _sum: {
          distance: true,
        },
      }),

      // Earliest workout date (check both strength and cardio)
      prisma.$queryRaw<Array<{ earliest: Date | null }>>`
        SELECT MIN("completedAt") as earliest
        FROM (
          SELECT "completedAt" FROM "WorkoutCompletion"
          WHERE "userId" = ${user.id} AND status = 'completed'
          UNION ALL
          SELECT "completedAt" FROM "LoggedCardioSession"
          WHERE "userId" = ${user.id} AND status = 'completed'
        ) AS all_workouts
      `,
    ])

    // Add cardio session counts to workout totals
    const [cardioThisWeek, cardioThisMonth, cardioAllTime] = await Promise.all([
      prisma.loggedCardioSession.count({
        where: {
          userId: user.id,
          status: 'completed',
          completedAt: { gte: startOfWeek },
        },
      }),
      prisma.loggedCardioSession.count({
        where: {
          userId: user.id,
          status: 'completed',
          completedAt: { gte: startOfMonth },
        },
      }),
      prisma.loggedCardioSession.count({
        where: {
          userId: user.id,
          status: 'completed',
        },
      }),
    ])

    // Calculate totals
    const totalVolumeLbs = volumeData._sum.totalVolumeLbs || 0
    const totalVolumeKg = totalVolumeLbs * 0.453592 // Convert lbs to kg

    const totalRunningMiles = runningData._sum.distance || 0
    const totalRunningKm = totalRunningMiles * 1.60934 // Convert miles to km

    const earliestDate = earliestWorkout[0]?.earliest || null

    return NextResponse.json({
      success: true,
      stats: {
        // Workout counts (strength + cardio)
        workoutsThisWeek: workoutsThisWeek + cardioThisWeek,
        workoutsThisMonth: workoutsThisMonth + cardioThisMonth,
        workoutsAllTime: workoutsAllTime + cardioAllTime,

        // Volume
        totalVolumeLbs: Math.round(totalVolumeLbs),
        totalVolumeKg: Math.round(totalVolumeKg),

        // Running distance
        totalRunningMiles: parseFloat(totalRunningMiles.toFixed(1)),
        totalRunningKm: parseFloat(totalRunningKm.toFixed(1)),

        // Training history
        earliestWorkout: earliestDate ? earliestDate.toISOString() : null,

        // Metadata
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching brag strip stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
