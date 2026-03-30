import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { calculateReadTime, generateSlug } from '@/lib/admin/slug'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/articles
 * List articles with optional status filter and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100)
    const search = searchParams.get('search')?.trim()

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [articles, totalCount] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { readStatuses: true, comments: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: articles.map((a) => ({
        ...a,
        tags: a.tags.map((at) => at.tag),
        readCount: a._count.readStatuses,
        commentCount: a._count.comments,
        _count: undefined,
      })),
      pagination: { page, limit, totalCount, totalPages },
    })
  } catch (error) {
    logger.error({ error }, 'Error listing articles')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/articles
 * Create a new article.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const body = await request.json()
    const { title, slug: providedSlug, bodyContent, level, tagIds, status: articleStatus } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 422 })
    }

    if (!bodyContent?.trim()) {
      return NextResponse.json({ error: 'Body content is required' }, { status: 422 })
    }

    if (!level) {
      return NextResponse.json({ error: 'Level is required' }, { status: 422 })
    }

    const slug = providedSlug?.trim() || generateSlug(title)

    // Check slug uniqueness
    const existing = await prisma.article.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'An article with this slug already exists' }, { status: 409 })
    }

    // Determine status based on role
    const finalStatus = auth.user.role === 'admin'
      ? (articleStatus || 'draft')
      : (articleStatus === 'published' ? 'pending_review' : (articleStatus || 'draft'))

    const readTimeMinutes = calculateReadTime(bodyContent)

    const article = await prisma.article.create({
      data: {
        title: title.trim(),
        slug,
        body: bodyContent,
        level,
        status: finalStatus,
        authorId: auth.user.id,
        readTimeMinutes,
        publishedAt: finalStatus === 'published' ? new Date() : null,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId: string) => ({ tagId })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    })

    logger.info({ articleId: article.id, title: article.title, status: finalStatus }, 'Article created')

    return NextResponse.json({
      data: { ...article, tags: article.tags.map((at) => at.tag) },
    })
  } catch (error) {
    logger.error({ error }, 'Error creating article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
