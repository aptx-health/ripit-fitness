import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify program exists and user owns it
    const program = await prisma.cardioProgram.findUnique({
      where: { id },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Unarchive program (set isArchived = false, archivedAt = null)
    const unarchivedProgram = await prisma.cardioProgram.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      program: unarchivedProgram,
    })
  } catch (error) {
    console.error('Error unarchiving cardio program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
