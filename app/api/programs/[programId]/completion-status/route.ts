import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getProgramCompletionStatus } from '@/lib/db/program-completion'
import { logger } from '@/lib/logger'

/**
 * GET /api/programs/[programId]/completion-status
 * Check if a program is fully completed
 */
export async function GET(
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

    // Get completion status
    const status = await getProgramCompletionStatus(prisma, programId, user.id)

    return NextResponse.json({ data: status })
  } catch (error) {
    logger.error({ error, programId: (await params).programId }, 'Error checking program completion')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
