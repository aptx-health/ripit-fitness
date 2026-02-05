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
    console.log(`[API /restart] Received restart request for program ${programId}`)

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[API /restart] Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[API /restart] User authenticated: ${user.id}`)

    // Verify program exists and user owns it
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        userId: user.id,
      },
    })

    if (!program) {
      console.log('[API /restart] Program not found or user does not own it')
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    console.log(`[API /restart] Program verified: ${program.name}`)

    // Restart the program
    const result = await restartProgram(prisma, programId, user.id)

    console.log(`[API /restart] Restart completed: ${result.archivedCompletions} completions archived`)

    return NextResponse.json({
      success: true,
      message: 'Program restarted successfully',
      archivedCompletions: result.archivedCompletions,
    })
  } catch (error) {
    console.error('[API /restart] Error restarting program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
