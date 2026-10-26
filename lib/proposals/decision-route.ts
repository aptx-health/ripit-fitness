import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  approveProposal,
  type DecisionCode,
  type DecisionResult,
  rejectProposal,
  revertProposal,
} from './service'

const STATUS_BY_CODE: Record<DecisionCode, number> = {
  not_found: 404,
  not_pending: 409,
  not_applied: 409,
  conflict: 409,
  in_use: 409,
  invalid: 422,
}

const DECISIONS = {
  approve: approveProposal,
  reject: rejectProposal,
  revert: revertProposal,
} as const

/**
 * Shared POST handler for /api/admin/proposals/[id]/{approve,reject,revert}.
 * The service does the work; this maps its result to HTTP.
 */
export function decisionRoute(action: keyof typeof DECISIONS) {
  return async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const auth = await requireAdmin({ rateLimit: true })
      if (auth.response) return auth.response

      const result: DecisionResult = await DECISIONS[action](prisma, id, auth.user.id)
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: STATUS_BY_CODE[result.code] }
        )
      }
      return NextResponse.json({ success: true, data: result.proposal })
    } catch (error) {
      logger.error({ error, action }, 'Error deciding proposal')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
