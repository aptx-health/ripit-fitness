import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/community-programs
 * List community programs with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const curated = searchParams.get('curated')
    const search = searchParams.get('search')?.trim()

    const where: Record<string, unknown> = {}

    if (level) {
      where.level = level
    }

    if (curated !== null) {
      where.curated = curated === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const programs = await prisma.communityProgram.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        level: true,
        curated: true,
        weekCount: true,
        workoutCount: true,
        exerciseCount: true,
        goals: true,
        targetDaysPerWeek: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    })

    return NextResponse.json({ data: programs })
  } catch (error) {
    logger.error({ error }, 'Error listing community programs')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
