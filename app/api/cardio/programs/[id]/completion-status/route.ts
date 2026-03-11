import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getCardioProgramCompletionStatus } from '@/lib/db/program-completion'
import { logger } from '@/lib/logger'

/**
 * GET /api/cardio/programs/[id]/completion-status
 * Check if a cardio program is fully completed
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardioProgramId } = await params

    logger.debug({ cardioProgramId }, 'Checking cardio program completion status')

    // Authenticate user
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      logger.debug({ cardioProgramId, authError }, 'Unauthorized request to check cardio completion')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.debug({ cardioProgramId, userId: user.id }, 'User authenticated, fetching completion status')

    // Get completion status
    const status = await getCardioProgramCompletionStatus(prisma, cardioProgramId, user.id)

    logger.debug({ cardioProgramId, userId: user.id, status }, 'Cardio program completion status retrieved')

    return NextResponse.json({ data: status })
  } catch (error) {
    logger.error({ error, cardioProgramId: (await params).id }, 'Error checking cardio program completion')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
