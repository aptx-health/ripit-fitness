import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getProgramCompletionStats } from '@/lib/db/program-completion'

/**
 * GET /api/programs/[programId]/completion-stats
 * Get detailed stats for program completion celebration
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

    // Get completion stats
    const stats = await getProgramCompletionStats(prisma, programId, user.id)

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('Error fetching program completion stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
