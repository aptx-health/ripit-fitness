import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { rankSimilar } from '@/lib/exercises/similar'
import { logger } from '@/lib/logger'
import { checkRateLimit, exerciseSimilarLimiter } from '@/lib/rate-limit'

/**
 * GET /api/exercises/similar?definitionId=<id>
 * Up to 8 exercises the user can use (library or their own custom) ranked by
 * rankSimilar, ties in name order. 404 for a definition the user can't see.
 * `current` carries the definition's own muscles and equipment for the
 * picker's "More like this" chips.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(exerciseSimilarLimiter, user.id)
    if (limited) return limited

    const definitionId = request.nextUrl.searchParams.get('definitionId')
    if (!definitionId) {
      return NextResponse.json({ error: 'definitionId is required' }, { status: 400 })
    }

    const visible = { OR: [{ isSystem: true }, { userId: user.id }] }

    const current = await prisma.exerciseDefinition.findFirst({
      where: { id: definitionId, ...visible },
      select: { id: true, name: true, primaryFAUs: true, equipment: true, movementPattern: true, isBodyweight: true },
    })
    if (!current) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }
    const source = { primaryFAUs: current.primaryFAUs, equipment: current.equipment }
    if (current.primaryFAUs.length === 0) {
      return NextResponse.json({ similar: [], current: source })
    }

    // Every visible exercise sharing a primary muscle; ranking happens in memory.
    const candidates = await prisma.exerciseDefinition.findMany({
      where: { AND: [visible, { primaryFAUs: { hasSome: current.primaryFAUs } }, { id: { not: current.id } }] },
      select: {
        id: true,
        name: true,
        primaryFAUs: true,
        secondaryFAUs: true,
        equipment: true,
        movementPattern: true,
        isBodyweight: true,
        isSystem: true,
        createdBy: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ similar: rankSimilar(current, candidates), current: source })
  } catch (error) {
    logger.error({ error, context: 'exercise-similar' }, 'Failed to load similar exercises')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
