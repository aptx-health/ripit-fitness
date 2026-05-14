import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { getCurrentStrengthWeek } from '@/lib/db/current-week'
import { logger } from '@/lib/logger'

/**
 * Returns the next incomplete workout for the user's active program, or null
 * if they have no active program / nothing left to do this week. Used by the
 * QuickActionSheet "Continue your program" item.
 */
export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await getCurrentStrengthWeek(user.id)
    if (!data) {
      return NextResponse.json({ next: null })
    }

    // First workout in the current week that isn't completed.
    const next = data.week.workouts.find((w) => {
      const latest = w.completions[0]
      return !latest || latest.status !== 'completed'
    })

    if (!next) {
      return NextResponse.json({ next: null })
    }

    return NextResponse.json({
      next: {
        workoutId: next.id,
        workoutName: next.name,
        dayNumber: next.dayNumber,
        weekNumber: data.week.weekNumber,
        totalWeeks: data.totalWeeks,
        programName: data.program.name,
        exerciseCount: next._count.exercises,
      },
    })
  } catch (err) {
    logger.error({ error: err, context: 'training-next-workout' }, 'Failed to resolve next workout')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
