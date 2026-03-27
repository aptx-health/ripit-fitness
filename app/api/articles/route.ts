import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const levels = searchParams.getAll('level')
    const topics = searchParams.getAll('topic')
    const bodyAreas = searchParams.getAll('body_area')
    const contexts = searchParams.getAll('context')

    // Build where clause for published articles only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'published',
    }

    // Search: match title, body, or tag names
    if (search.trim()) {
      const term = search.trim()
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { body: { contains: term, mode: 'insensitive' } },
        {
          tags: {
            some: {
              tag: { name: { contains: term, mode: 'insensitive' } },
            },
          },
        },
      ]
    }

    // Level filter (multi-select, OR within category)
    if (levels.length > 0) {
      where.level = { in: levels }
    }

    // Tag filters (AND across categories, OR within each category)
    const tagFilters = []
    if (topics.length > 0) {
      tagFilters.push({
        tags: {
          some: {
            tag: { category: 'topic', name: { in: topics } },
          },
        },
      })
    }
    if (bodyAreas.length > 0) {
      tagFilters.push({
        tags: {
          some: {
            tag: { category: 'body_area', name: { in: bodyAreas } },
          },
        },
      })
    }
    if (contexts.length > 0) {
      tagFilters.push({
        tags: {
          some: {
            tag: { category: 'context', name: { in: contexts } },
          },
        },
      })
    }
    if (tagFilters.length > 0) {
      where.AND = tagFilters
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        level: true,
        readTimeMinutes: true,
        publishedAt: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        readStatuses: {
          where: { userId: user.id },
          select: {
            lastReadAt: true,
          },
        },
      },
    })

    // Flatten tag structure and read status for the client
    const formatted = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      level: article.level,
      readTimeMinutes: article.readTimeMinutes,
      publishedAt: article.publishedAt,
      tags: article.tags.map((at) => at.tag),
      readStatus: article.readStatuses[0]
        ? { lastReadAt: article.readStatuses[0].lastReadAt }
        : null,
    }))

    // Fetch available tags for filter UI
    const tags = await prisma.tag.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
      },
    })

    // Fetch collections with their articles for the collections section
    const collections = await prisma.collection.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        articles: {
          orderBy: { order: 'asc' },
          take: 4,
          select: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                level: true,
                readTimeMinutes: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      articles: formatted,
      tags,
      collections,
    })
  } catch (err) {
    logger.error({ error: err, context: 'articles-browse' }, 'Failed to fetch articles')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
