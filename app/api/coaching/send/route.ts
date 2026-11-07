import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { SEND_KINDS, type SendKind, sendToTrainee } from '@/lib/coaching/send'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, coachSendLimiter } from '@/lib/rate-limit'

const NOTE_MAX = 1000

const STATUS = { not_linked: 403, not_found: 404, invalid: 400, duplicate: 409 } as const

/**
 * POST /api/coaching/send { linkId, kind, sourceId, note? }: sends a copy of
 * the coach's own program or saved workout to the trainee on an active link,
 * as a pending proposal. 201 { proposalId }; refusals carry { code, reason }
 * (and missingExercises for exercises the trainee doesn't have). 409
 * duplicate: the same thing is already waiting for the trainee.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(coachSendLimiter, user.id)
    if (limited) return limited

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const linkId = typeof body?.linkId === 'string' ? body.linkId : ''
    const sourceId = typeof body?.sourceId === 'string' ? body.sourceId : ''
    const kind = body?.kind as SendKind
    const note = body?.note
    if (!linkId || !sourceId || !SEND_KINDS.includes(kind)) {
      return NextResponse.json({ error: 'linkId, kind (program or saved_workout) and sourceId are required' }, { status: 400 })
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > NOTE_MAX)) {
      return NextResponse.json({ error: `note must be text up to ${NOTE_MAX} characters` }, { status: 400 })
    }

    const result = await sendToTrainee(prisma, user.id, { linkId, kind, sourceId, ...(note !== undefined && { note }) })
    if (!result.ok) {
      logger.info({ userId: user.id, linkId, kind, code: result.code }, 'Coach send refused')
      return NextResponse.json(
        {
          code: result.code,
          ...(result.missingExercises && { missingExercises: result.missingExercises }),
          ...(result.reason && { reason: result.reason }),
        },
        { status: STATUS[result.code] }
      )
    }
    logger.info({ userId: user.id, linkId, kind, proposalId: result.proposalId }, 'Coach sent to trainee')
    return NextResponse.json({ proposalId: result.proposalId }, { status: 201 })
  } catch (error) {
    logger.error({ error, context: 'coaching-send' }, 'Failed to send to trainee')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
