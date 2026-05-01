import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/waiver
 *
 * Returns waiver acceptance history for audit / legal discovery.
 * Optionally filtered by userId query param.
 * Requires editor role.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)),
      100
    )

    const where: Record<string, unknown> = {}
    if (userId) {
      where.userId = userId
    }

    const [records, totalCount] = await Promise.all([
      prisma.waiverAcceptance.findMany({
        where,
        orderBy: { acceptedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.waiverAcceptance.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: records.map((r) => ({
        id: r.id,
        userId: r.userId,
        waiverVersion: r.waiverVersion,
        acceptedAt: r.acceptedAt.toISOString(),
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
      })),
      pagination: { page, limit, totalCount, totalPages },
    })
  } catch (error) {
    logger.error({ error, context: 'GET /api/admin/waiver' }, 'Failed to list waiver acceptances')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
