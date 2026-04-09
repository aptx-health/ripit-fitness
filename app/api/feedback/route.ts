import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { sendDiscordNotification } from '@/lib/discord'
import { logger } from '@/lib/logger'
import type { FeedbackCategory } from '@/types/feedback'
import { VALID_CATEGORIES } from '@/types/feedback'

const MAX_MESSAGE_LENGTH = 2000
const RATE_LIMIT_PER_HOUR = 5

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, message, pageUrl, userAgent } = body as {
      category: string
      message: string
      pageUrl: string
      userAgent?: string
    }

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category as FeedbackCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    // Validate pageUrl
    if (!pageUrl || pageUrl.trim().length === 0) {
      return NextResponse.json({ error: 'Page URL is required' }, { status: 400 })
    }

    // Rate limit: max submissions per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCount = await prisma.feedback.count({
      where: {
        userId: user.id,
        createdAt: { gt: oneHourAgo },
      },
    })

    if (recentCount >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      )
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        category,
        message: message.trim(),
        pageUrl,
        userAgent: userAgent || null,
      },
    })

    logger.info({ feedbackId: feedback.id, category, userId: user.id }, 'Feedback submitted')

    // Discord notification (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ripit.fit'
    sendDiscordNotification({
      title: `Feedback: ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      description: message.trim().substring(0, 200) + (message.trim().length > 200 ? '...' : ''),
      color: 0xEA580C,
      url: `${appUrl}/admin/feedback?expand=${feedback.id}`,
      fields: [
        { name: 'Page', value: pageUrl, inline: true },
        { name: 'User', value: user.email || user.id, inline: true },
      ],
    })

    return NextResponse.json({ success: true, id: feedback.id })
  } catch (error) {
    logger.error({ error, context: 'feedback-submit' }, 'Failed to submit feedback')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireEditor()
    if (response) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (status === 'unresolved') {
      where.status = { in: ['new', 'reviewed'] }
    } else if (status) {
      where.status = status
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.feedback.count({ where }),
    ])

    return NextResponse.json({ feedback, total, limit, offset })
  } catch (error) {
    logger.error({ error, context: 'feedback-list' }, 'Failed to list feedback')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
