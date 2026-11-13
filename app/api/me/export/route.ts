import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { buildRipitExport, exportFilename } from '@/lib/export/ripit-export'
import { logger } from '@/lib/logger'
import { checkRateLimitWithHeaders, dataExportLimiter } from '@/lib/rate-limit'

/**
 * GET /api/me/export
 * The signed-in user's training data as one ripit-export v1 JSON file
 * (docs/RIPIT_EXPORT_FORMAT.md), for Settings → Download my data.
 */

export const dynamic = 'force-dynamic'

export async function GET(_request: Request): Promise<Response> {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimitWithHeaders(dataExportLimiter, user.id, { endpoint: '/api/me/export' })
    if (rl.response) return rl.response

    const started = Date.now()
    const now = new Date()
    const file = await buildRipitExport(prisma, user.id, now)
    const body = JSON.stringify(file)
    logger.info(
      {
        userId: user.id,
        programs: file.programs.length,
        completions: file.workoutCompletions.length,
        bytes: body.length,
        ms: Date.now() - started,
      },
      'Data export'
    )

    return new Response(body, {
      status: 200,
      headers: {
        ...rl.headers,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFilename(now)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error }, 'Data export failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
