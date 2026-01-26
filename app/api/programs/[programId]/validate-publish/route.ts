import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { validateProgramForPublishing, calculateProgramStats } from '@/lib/community/validation'
import { getUserDisplayName } from '@/lib/community/publishing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate the program
    const validationResult = await validateProgramForPublishing(prisma, programId, user.id)

    if (!validationResult.valid) {
      return NextResponse.json({
        valid: false,
        errors: validationResult.errors,
      })
    }

    // Get program stats
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                exercises: true,
              },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const stats = calculateProgramStats(program)

    // Get user's display name (with fallback)
    const displayName = await getUserDisplayName(prisma, user.id)

    return NextResponse.json({
      valid: true,
      errors: [],
      stats,
      displayName: displayName === 'Anonymous User' ? null : displayName,
    })
  } catch (error) {
    console.error('Error validating program for publishing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
