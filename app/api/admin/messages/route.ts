import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import {
  isValidPlacement,
  isValidUserType,
  isValidLifecycle,
  isValidIcon,
  validateMessageContent,
  validateProgramTargeting,
} from '@/lib/admin/message-validation'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/messages
 * List in-app messages with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const placement = searchParams.get('placement')
    const userType = searchParams.get('userType')
    const active = searchParams.get('active')
    const search = searchParams.get('search')?.trim()

    const where: Record<string, unknown> = {}

    if (placement && isValidPlacement(placement)) {
      where.placement = placement
    }

    if (userType && isValidUserType(userType)) {
      where.userType = userType
    }

    if (active !== null && active !== '') {
      where.active = active === 'true'
    }

    if (search) {
      where.content = { contains: search, mode: 'insensitive' }
    }

    const messages = await prisma.inAppMessage.findMany({
      where,
      orderBy: [{ placement: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ data: messages })
  } catch (error) {
    logger.error({ error }, 'Error listing in-app messages')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/messages
 * Create a new in-app message.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const body = await request.json()
    const {
      name,
      content,
      placement,
      userType = 'all',
      icon = 'Lightbulb',
      lifecycle = 'show_always',
      minWorkouts,
      maxWorkouts,
      programTargeting,
      priority = 0,
      active = true,
    } = body

    // Validate content
    const contentError = validateMessageContent(content)
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 422 })
    }

    if (!placement || !isValidPlacement(placement)) {
      return NextResponse.json({ error: 'Valid placement is required (training_tab or exercise_logger)' }, { status: 422 })
    }

    if (!isValidUserType(userType)) {
      return NextResponse.json({ error: 'Invalid userType (beginner, experienced, or all)' }, { status: 422 })
    }

    if (!isValidLifecycle(lifecycle)) {
      return NextResponse.json({ error: 'Invalid lifecycle (show_once, show_until_dismissed, or show_always)' }, { status: 422 })
    }

    if (!isValidIcon(icon)) {
      return NextResponse.json({ error: 'Invalid icon selection' }, { status: 422 })
    }

    const targetingError = validateProgramTargeting(programTargeting)
    if (targetingError) {
      return NextResponse.json({ error: targetingError }, { status: 422 })
    }

    if (minWorkouts !== null && minWorkouts !== undefined && (typeof minWorkouts !== 'number' || minWorkouts < 0)) {
      return NextResponse.json({ error: 'minWorkouts must be a non-negative number' }, { status: 422 })
    }

    if (maxWorkouts !== null && maxWorkouts !== undefined && (typeof maxWorkouts !== 'number' || maxWorkouts < 0)) {
      return NextResponse.json({ error: 'maxWorkouts must be a non-negative number' }, { status: 422 })
    }

    const message = await prisma.inAppMessage.create({
      data: {
        name: name?.trim() || null,
        content: content.trim(),
        placement,
        userType,
        icon,
        lifecycle,
        minWorkouts: minWorkouts ?? null,
        maxWorkouts: maxWorkouts ?? null,
        programTargeting: programTargeting || null,
        ownerType: 'platform',
        priority,
        active,
      },
    })

    logger.info({ messageId: message.id, placement }, 'In-app message created')

    return NextResponse.json({ data: message })
  } catch (error) {
    logger.error({ error }, 'Error creating in-app message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
