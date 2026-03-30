import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { VALID_STATUSES } from '@/types/feedback'
import type { FeedbackStatus } from '@/types/feedback'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { feedbackId } = await params

    const body = await request.json()
    const { status, adminNote } = body as {
      status?: string
      adminNote?: string
    }

    // Validate at least one field is provided
    if (status === undefined && adminNote === undefined) {
      return NextResponse.json(
        { error: 'At least one of status or adminNote is required' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status as FeedbackStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Check feedback exists
    const existing = await prisma.feedback.findUnique({ where: { id: feedbackId } })
    if (!existing) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    const feedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        ...(status !== undefined && { status }),
        ...(adminNote !== undefined && { adminNote }),
      },
    })

    logger.info({ feedbackId, status, adminNote }, 'Feedback updated')

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    logger.error({ error, context: 'feedback-update' }, 'Failed to update feedback')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
