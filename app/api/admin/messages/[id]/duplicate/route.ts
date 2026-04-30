import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/messages/[id]/duplicate
 * Create a copy of an existing message with "(Copy)" appended to the name.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { id } = await params

    const existing = await prisma.inAppMessage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const duplicate = await prisma.inAppMessage.create({
      data: {
        name: existing.name ? `${existing.name} (Copy)` : '(Copy)',
        content: existing.content,
        placement: existing.placement,
        userType: existing.userType,
        icon: existing.icon,
        lifecycle: existing.lifecycle,
        minWorkouts: existing.minWorkouts,
        maxWorkouts: existing.maxWorkouts,
        programTargeting: existing.programTargeting,
        ownerType: existing.ownerType,
        ownerId: existing.ownerId,
        priority: existing.priority,
        active: false, // duplicates start inactive
        locale: existing.locale,
      },
    })

    logger.info({ sourceId: id, duplicateId: duplicate.id }, 'In-app message duplicated')

    return NextResponse.json({ data: duplicate })
  } catch (error) {
    logger.error({ error }, 'Error duplicating in-app message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
