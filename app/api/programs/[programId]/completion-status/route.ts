import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getProgramCompletionStatus } from '@/lib/db/program-completion'
import { logger } from '@/lib/logger'

/**
 * GET /api/programs/[programId]/completion-status
 * Check if a program is fully completed
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Authenticate user
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get completion status
    const status = await getProgramCompletionStatus(prisma, programId, user.id)

    return NextResponse.json({ data: status })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error({
      error: errorMessage,
      stack: errorStack,
      programId: (await params).programId
    }, 'Error checking program completion')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
