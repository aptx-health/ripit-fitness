import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify program exists and user owns it
    const program = await prisma.program.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Archive program (set isArchived = true, archivedAt = now)
    // If program was active, deactivate it
    const archivedProgram = await prisma.program.update({
      where: { id: programId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        isActive: false, // Deactivate when archiving
      },
    })

    return NextResponse.json({
      success: true,
      program: archivedProgram,
    })
  } catch (error) {
    console.error('Error archiving program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
