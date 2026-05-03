import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import {
  isValidIcon,
  isValidLifecycle,
  isValidPlacement,
  isValidUserType,
  validateMessageContent,
  validateProgramTargeting,
} from '@/lib/admin/message-validation'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/messages/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const message = await prisma.inAppMessage.findUnique({ where: { id } })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    return NextResponse.json({ data: message })
  } catch (error) {
    logger.error({ error }, 'Error fetching in-app message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/messages/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.inAppMessage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      data.name = body.name?.trim() || null
    }

    if (body.content !== undefined) {
      const contentError = validateMessageContent(body.content)
      if (contentError) {
        return NextResponse.json({ error: contentError }, { status: 422 })
      }
      data.content = body.content.trim()

      // Increment version when content changes
      if (data.content !== existing.content) {
        data.version = existing.version + 1
      }
    }

    if (body.placement !== undefined) {
      if (!isValidPlacement(body.placement)) {
        return NextResponse.json({ error: 'Invalid placement' }, { status: 422 })
      }
      data.placement = body.placement
    }

    if (body.userType !== undefined) {
      if (!isValidUserType(body.userType)) {
        return NextResponse.json({ error: 'Invalid userType' }, { status: 422 })
      }
      data.userType = body.userType
    }

    if (body.lifecycle !== undefined) {
      if (!isValidLifecycle(body.lifecycle)) {
        return NextResponse.json({ error: 'Invalid lifecycle' }, { status: 422 })
      }
      data.lifecycle = body.lifecycle
    }

    if (body.icon !== undefined) {
      if (!isValidIcon(body.icon)) {
        return NextResponse.json({ error: 'Invalid icon' }, { status: 422 })
      }
      data.icon = body.icon
    }

    if (body.programTargeting !== undefined) {
      const targetingError = validateProgramTargeting(body.programTargeting)
      if (targetingError) {
        return NextResponse.json({ error: targetingError }, { status: 422 })
      }
      data.programTargeting = body.programTargeting || null
    }

    if (body.minWorkouts !== undefined) {
      data.minWorkouts = body.minWorkouts
    }
    if (body.maxWorkouts !== undefined) {
      data.maxWorkouts = body.maxWorkouts
    }
    if (body.priority !== undefined) {
      data.priority = body.priority
    }
    if (body.active !== undefined) {
      data.active = body.active
    }
    if (body.slides !== undefined) {
      data.slides = body.slides || null
    }

    const message = await prisma.inAppMessage.update({
      where: { id },
      data,
    })

    logger.info({ messageId: id, changes: Object.keys(data) }, 'In-app message updated')

    return NextResponse.json({ data: message })
  } catch (error) {
    logger.error({ error }, 'Error updating in-app message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/messages/[id]
 */
export async function DELETE(
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

    await prisma.inAppMessage.delete({ where: { id } })

    logger.info({ messageId: id }, 'In-app message deleted')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error deleting in-app message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
