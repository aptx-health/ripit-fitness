import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { restartProgram } from '@/lib/db/program-restart'

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

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify program exists and user owns it
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        userId: user.id,
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Restart the program
    const result = await restartProgram(prisma, programId, user.id)

    return NextResponse.json({
      success: true,
      message: 'Program restarted successfully',
      archivedCompletions: result.archivedCompletions,
    })
  } catch (error) {
    console.error('Error restarting program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
