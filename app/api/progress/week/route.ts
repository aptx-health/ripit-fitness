import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getWeeklyReport, isValidTimeZone, weekStartFor } from '@/lib/insights/progress'
import { logger } from '@/lib/logger'
import { checkRateLimitWithHeaders, progressReadLimiter } from '@/lib/rate-limit'

/** A real calendar date in YYYY-MM-DD form that is a Monday. */
function isMonday(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day && date.getUTCDay() === 1
}

/**
 * GET /api/progress/week?start=YYYY-MM-DD&tz=<IANA zone>
 * The weekly report for the signed-in user. `tz` is the browser's zone;
 * `start` is a local Monday, the current week when left out, never a later one.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimitWithHeaders(progressReadLimiter, user.id, { endpoint: 'progress/week' })
    if (limited.response) return limited.response

    const params = request.nextUrl.searchParams
    const timeZone = params.get('tz') ?? ''
    if (!isValidTimeZone(timeZone)) {
      return NextResponse.json({ error: 'tz must be an IANA time zone' }, { status: 400, headers: limited.headers })
    }
    const start = params.get('start')
    if (start !== null && !isMonday(start)) {
      return NextResponse.json({ error: 'start must be a Monday as YYYY-MM-DD' }, { status: 400, headers: limited.headers })
    }

    const currentWeek = weekStartFor(new Date(), timeZone)
    if (start !== null && start > currentWeek) {
      return NextResponse.json({ error: 'start must not be after the current week' }, { status: 400, headers: limited.headers })
    }

    const weekStart = start ?? currentWeek
    const report = await getWeeklyReport(prisma, user.id, { weekStart, timeZone })
    return NextResponse.json({ success: true, report }, { headers: limited.headers })
  } catch (error) {
    logger.error({ error, context: 'progress-week' }, 'Failed to build the weekly report')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
