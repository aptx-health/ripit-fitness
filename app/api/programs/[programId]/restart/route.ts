import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { restartProgram } from '@/lib/db/program-restart'
import { logger } from '@/lib/logger'

/**
 * POST /api/programs/[programId]/restart
 * Restart a program by archiving all workout completions
 * Preserves all logged sets for history
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params
    logger.debug({ programId }, 'Received restart request')

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.debug('Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.debug({ userId: user.id, programId }, 'User authenticated')

    // Verify program exists and user owns it
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        userId: user.id,
      },
    })

    if (!program) {
      logger.debug({ programId, userId: user.id }, 'Program not found or user does not own it')
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    logger.debug({ programId, programName: program.name }, 'Program verified')

    // Restart the program
    const result = await restartProgram(prisma, programId, user.id)

    logger.info(
      { programId, archivedCompletions: result.archivedCompletions },
      'Program restarted successfully'
    )

    return NextResponse.json({
      success: true,
      message: 'Program restarted successfully',
      archivedCompletions: result.archivedCompletions,
    })
  } catch (error) {
    logger.error({ error, programId: (await params).programId }, 'Error restarting program')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
