import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { sendDiscordNotification } from '@/lib/discord'
import { logger } from '@/lib/logger'
import { checkRateLimit, feedbackSubmissionLimiter } from '@/lib/rate-limit'
import type { FeedbackCategory } from '@/types/feedback'
import { VALID_CATEGORIES, VALID_REFINEMENTS } from '@/types/feedback'

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 submissions / hour / user. Replaces a prior DB-count
    // check that hit Postgres on every POST.
    const limited = await checkRateLimit(feedbackSubmissionLimiter, user.id)
    if (limited) return limited

    const body = await request.json()
    const { category, message, pageUrl, userAgent, properties, rating, refinements } = body as {
      category: string
      message?: string
      pageUrl: string
      userAgent?: string
      properties?: Record<string, string>
      rating?: number
      refinements?: string[]
    }

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category as FeedbackCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // For post_session, message is optional (rating is the primary data)
    const isPostSession = category === 'post_session'
    const trimmedMessage = message?.trim() || ''

    // Validate message (required for non-post_session categories)
    if (!isPostSession && trimmedMessage.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    // Validate pageUrl
    if (!pageUrl || pageUrl.trim().length === 0) {
      return NextResponse.json({ error: 'Page URL is required' }, { status: 400 })
    }

    // Validate rating if provided (1-5)
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
      }
    }

    // Post-session requires rating
    if (isPostSession && (rating === undefined || rating === null)) {
      return NextResponse.json({ error: 'Rating is required for post-session feedback' }, { status: 400 })
    }

    // Validate refinements if provided
    const validatedRefinements: string[] = []
    if (refinements && Array.isArray(refinements)) {
      for (const r of refinements) {
        if (!VALID_REFINEMENTS.includes(r)) {
          return NextResponse.json(
            { error: `Invalid refinement: ${r}` },
            { status: 400 }
          )
        }
        validatedRefinements.push(r)
      }
    }

    // Validate properties if provided (must be a flat string-keyed object)
    let propertiesJson: string | null = null
    if (properties && typeof properties === 'object') {
      propertiesJson = JSON.stringify(properties)
      if (propertiesJson.length > 2000) {
        return NextResponse.json(
          { error: 'Properties too large' },
          { status: 400 }
        )
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        category,
        message: trimmedMessage,
        pageUrl,
        userAgent: userAgent || null,
        properties: propertiesJson,
        rating: rating ?? null,
        refinements: validatedRefinements,
      },
    })

    logger.info({ feedbackId: feedback.id, category, rating, userId: user.id }, 'Feedback submitted')

    // Discord notification (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ripit.fit'
    const discordFields = [
      { name: 'Page', value: pageUrl, inline: true },
      { name: 'User', value: user.email || user.id, inline: true },
    ]
    if (isPostSession && rating) {
      discordFields.unshift({ name: 'Rating', value: `${rating}/5`, inline: true })
    }
    if (validatedRefinements.length > 0) {
      discordFields.push({ name: 'Issues', value: validatedRefinements.join(', '), inline: false })
    }

    const discordDescription = trimmedMessage
      ? trimmedMessage.substring(0, 200) + (trimmedMessage.length > 200 ? '...' : '')
      : isPostSession ? `Rating: ${rating}/5` : '(no message)'

    sendDiscordNotification({
      title: `Feedback: ${isPostSession ? 'Post-Session' : category.charAt(0).toUpperCase() + category.slice(1)}`,
      description: discordDescription,
      color: isPostSession ? 0x8B5CF6 : 0xEA580C,
      url: `${appUrl}/admin/feedback?expand=${feedback.id}`,
      fields: discordFields,
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
    const categoryFilter = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (status === 'unresolved') {
      where.status = { in: ['new', 'reviewed'] }
    } else if (status) {
      where.status = status
    }
    if (categoryFilter) {
      where.category = categoryFilter
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
