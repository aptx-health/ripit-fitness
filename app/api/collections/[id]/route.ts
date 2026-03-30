import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/collections/[id]
 * Public endpoint: fetch a collection with articles and user's read status.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const collection = await prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        articles: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                level: true,
                readTimeMinutes: true,
                status: true,
                readStatuses: {
                  where: { userId: user.id },
                  select: { lastReadAt: true },
                },
              },
            },
          },
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Only include published articles, flatten structure
    const articles = collection.articles
      .filter((ca) => ca.article.status === 'published')
      .map((ca) => ({
        id: ca.article.id,
        title: ca.article.title,
        slug: ca.article.slug,
        level: ca.article.level,
        readTimeMinutes: ca.article.readTimeMinutes,
        order: ca.order,
        isRead: ca.article.readStatuses.length > 0,
      }))

    const readCount = articles.filter((a) => a.isRead).length

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      articles,
      readCount,
      totalCount: articles.length,
    })
  } catch (err) {
    logger.error({ error: err, context: 'collection-detail' }, 'Failed to fetch collection')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
