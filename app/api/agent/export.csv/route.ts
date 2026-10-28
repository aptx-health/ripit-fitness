import { NextResponse } from 'next/server'
import { resolveAgentToken } from '@/lib/agent-tokens'
import { prisma } from '@/lib/db'
import { fetchExportRows, MAX_CSV_RANGE_DAYS, parseRange, rangeDays, toCsv } from '@/lib/insights/export'
import { logger } from '@/lib/logger'
import { agentMcpLimiter, checkRateLimitWithHeaders } from '@/lib/rate-limit'

/**
 * GET /api/agent/export.csv?since=&until=
 * Every logged set in the range as one CSV file, for agent scripts. Auth is
 * the same agent bearer token as /api/mcp; rows come from lib/insights/export.ts.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  try {
    // Header only: a token in the URL would end up in logs.
    const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    const agent = bearer ? await resolveAgentToken(prisma, bearer) : null
    if (!agent) {
      logger.debug({ hasBearer: !!bearer }, 'Agent export auth: unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } })
    }

    const rl = await checkRateLimitWithHeaders(agentMcpLimiter, agent.tokenId, { endpoint: '/api/agent/export.csv' })
    if (rl.response) return rl.response

    const params = new URL(request.url).searchParams
    const sinceParam = params.get('since')
    const untilParam = params.get('until')
    const now = new Date()
    const range = parseRange(sinceParam, untilParam, now)
    if (!range.ok) {
      return NextResponse.json({ error: range.error, field: range.field }, { status: 400, headers: rl.headers })
    }
    if (rangeDays(range.since, range.until) > MAX_CSV_RANGE_DAYS) {
      return NextResponse.json(
        { error: `range is longer than ${MAX_CSV_RANGE_DAYS} days; move since later`, field: 'since' },
        { status: 400, headers: rl.headers }
      )
    }

    const rows = await fetchExportRows(prisma, agent.userId, range)
    logger.info({ tokenId: agent.tokenId, userId: agent.userId, rows: rows.length }, 'Agent CSV export')

    // An empty until= means "now", as in parseRange.
    const filename = `ripit-training-${sinceParam}-${untilParam || now.toISOString().slice(0, 10)}.csv`
    return new Response(toCsv(rows), {
      status: 200,
      headers: {
        ...rl.headers,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error }, 'Agent CSV export failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
