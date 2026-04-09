import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, programManagementLimiter } from '@/lib/rate-limit'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(programManagementLimiter, user.id)
    if (limited) return limited

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

    // Deactivate all user's programs, then activate this one
    await prisma.$transaction([
      prisma.program.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      }),
      prisma.program.update({
        where: { id: programId },
        data: { isActive: true },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error, context: 'program-activate' }, 'Error activating program')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
