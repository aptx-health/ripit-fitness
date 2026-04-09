import { NextResponse } from 'next/server'
import { getAnalyticsData } from '@/lib/admin/analytics-queries'
import { requireEditor } from '@/lib/admin/auth'
import { logger } from '@/lib/logger'

// Cache analytics data for 5 minutes
let cachedData: { data: Awaited<ReturnType<typeof getAnalyticsData>>; expiresAt: number } | null =
  null
const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET() {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const now = Date.now()
    if (cachedData && cachedData.expiresAt > now) {
      return NextResponse.json({ data: cachedData.data })
    }

    const data = await getAnalyticsData()
    cachedData = { data, expiresAt: now + CACHE_TTL_MS }

    return NextResponse.json({ data })
  } catch (error) {
    logger.error({ error, context: 'admin-analytics' }, 'Failed to fetch analytics')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
