import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/cardio/programs/[id]/activate
 * Set a cardio program as active (deactivates all others)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Await params (Next.js 15 pattern)
    const { id } = await params

    // Verify program belongs to user
    const program = await prisma.cardioProgram.findFirst({
      where: {
        id,
        userId: user.id,
        isArchived: false
      }
    })

    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found or archived' },
        { status: 404 }
      )
    }

    // Use transaction to ensure only one active program
    await prisma.$transaction([
      // Deactivate all user's cardio programs
      prisma.cardioProgram.updateMany({
        where: {
          userId: user.id,
          isActive: true
        },
        data: {
          isActive: false
        }
      }),
      // Activate the selected program
      prisma.cardioProgram.update({
        where: { id },
        data: {
          isActive: true
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Program activated'
    })
  } catch (error) {
    console.error('Error activating cardio program:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
