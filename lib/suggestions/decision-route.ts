import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { type AcceptChoices, acceptChoices, splitBundle, unknownChoices } from '@/lib/coaching/custom-exercises'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { STATUS_BY_CODE } from '@/lib/proposals/decision-route'
import { approveProposal, type DecisionCode, type DecisionResult, rejectProposal } from '@/lib/proposals/service'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { findSuggestion } from './detail'

/** What users read for each failure; never the service's own text, which says "proposal". */
export const SUGGESTION_ERRORS: Record<DecisionCode, string> = {
  not_pending: 'This suggestion was already decided.',
  conflict: 'This suggestion no longer applies.',
  not_found: 'Suggestion not found.',
  invalid: "This suggestion can't be applied.",
  // Revert-only codes; users can't revert, so these never reach them.
  not_applied: 'This suggestion was already decided.',
  in_use: "This suggestion can't be applied.",
}

/**
 * Shared POST handler for /api/suggestions/[id]/{accept,reject}: the user's
 * side of the admin decision route. The same service calls and result mapping,
 * but signed-in users only, their own allowed-kind suggestions only (anything
 * else is a 404 before the service runs), and no revert. Responses carry only
 * the suggestion's id, status and kind. Accept takes an optional JSON body:
 * the choices for a coach send's custom exercises (lib/coaching/custom-exercises).
 */
export function suggestionDecisionRoute(action: 'accept' | 'reject') {
  return async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const { user, error } = await getCurrentUser()
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const limited = await checkRateLimit(workoutActionLimiter, user.id)
      if (limited) return limited

      const suggestion = await findSuggestion(user.id, id)
      if (!suggestion) {
        return NextResponse.json({ error: SUGGESTION_ERRORS.not_found, code: 'not_found' }, { status: 404 })
      }

      let choices: AcceptChoices | undefined
      if (action === 'accept') {
        const read = await readChoices(request)
        if (!read.ok || unknownChoices(splitBundle(suggestion.payload).bundle, read.choices).length) {
          return NextResponse.json({ error: "Those choices don't match this suggestion.", code: 'invalid' }, { status: 400 })
        }
        choices = read.choices
      }

      const result: DecisionResult =
        action === 'accept' ? await approveProposal(prisma, id, user.id, choices) : await rejectProposal(prisma, id, user.id)
      if (!result.ok) {
        return NextResponse.json(
          { error: result.userError ?? SUGGESTION_ERRORS[result.code], code: result.code },
          { status: STATUS_BY_CODE[result.code] }
        )
      }

      const { id: proposalId, status, kind, targetId } = result.proposal
      const data = { id: proposalId, status, kind }
      if (action === 'reject') return NextResponse.json({ success: true, data })
      return NextResponse.json({ success: true, data, programId: kind === 'program.create' ? targetId : null })
    } catch (error) {
      logger.error({ error, action }, 'Error deciding suggestion')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/** The accept body's choices; no body is all defaults. */
async function readChoices(request: Request): Promise<{ ok: true; choices?: AcceptChoices } | { ok: false }> {
  const text = await request.text()
  if (!text.trim()) return { ok: true }
  try {
    const parsed = acceptChoices.safeParse(JSON.parse(text))
    return parsed.success ? { ok: true, choices: parsed.data } : { ok: false }
  } catch {
    return { ok: false }
  }
}
