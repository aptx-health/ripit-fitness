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
    const sort = searchParams.get('sort') // 'rating_asc' or 'rating_desc'
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

    // Determine sort order
    type OrderByClause = Record<string, 'asc' | 'desc'>
    let orderBy: OrderByClause | OrderByClause[] = { createdAt: 'desc' as const }
    if (sort === 'rating_asc') {
      orderBy = [{ rating: 'asc' as const }, { createdAt: 'desc' as const }]
    } else if (sort === 'rating_desc') {
      orderBy = [{ rating: 'desc' as const }, { createdAt: 'desc' as const }]
    }

    const queries: [Promise<unknown[]>, Promise<number>, ...Promise<unknown>[]] = [
      prisma.feedback.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.feedback.count({ where }),
    ]

    // When filtering by post_session, include aggregation stats
    const isPostSession = categoryFilter === 'post_session'
    if (isPostSession) {
      queries.push(
        prisma.feedback.aggregate({
          where: { category: 'post_session' },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        prisma.feedback.aggregate({
          where: {
            category: 'post_session',
            createdAt: { gte: startOfWeek() },
          },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        prisma.feedback.groupBy({
          by: ['rating'],
          where: { category: 'post_session', rating: { not: null } },
          _count: { rating: true },
          orderBy: { rating: 'asc' },
        }),
        // Refinement counts via raw query (Prisma can't group by array elements)
        prisma.$queryRaw`
          SELECT unnest(refinements) as refinement, COUNT(*)::int as count
          FROM "Feedback"
          WHERE category = 'post_session' AND array_length(refinements, 1) > 0
          GROUP BY refinement
          ORDER BY count DESC
        `,
      )
    }

    const results = await Promise.all(queries)
    const feedback = results[0]
    const total = results[1] as number

    const responseBody: Record<string, unknown> = { feedback, total, limit, offset }

    if (isPostSession) {
      const overallAgg = results[2] as { _avg: { rating: number | null }; _count: { rating: number } }
      const weekAgg = results[3] as { _avg: { rating: number | null }; _count: { rating: number } }
      const ratingGroups = results[4] as Array<{ rating: number; _count: { rating: number } }>
      const refinementCounts = results[5] as Array<{ refinement: string; count: number }>

      // Build rating distribution (1-5)
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const g of ratingGroups) {
        if (g.rating >= 1 && g.rating <= 5) {
          ratingDistribution[g.rating] = g._count.rating
        }
      }

      const totalRated = overallAgg._count.rating
      const fiveStarCount = ratingDistribution[5]
      const fiveStarPct = totalRated > 0 ? Math.round((fiveStarCount / totalRated) * 100) : 0

      responseBody.postSessionStats = {
        avgRatingOverall: overallAgg._avg.rating ? Math.round(overallAgg._avg.rating * 10) / 10 : null,
        avgRatingThisWeek: weekAgg._avg.rating ? Math.round(weekAgg._avg.rating * 10) / 10 : null,
        sampleSizeOverall: totalRated,
        sampleSizeThisWeek: weekAgg._count.rating,
        ratingDistribution,
        fiveStarPct,
        refinementCounts,
      }
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    logger.error({ error, context: 'feedback-list' }, 'Failed to list feedback')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Returns the start of the current week (Sunday 00:00:00) */
function startOfWeek(): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}
