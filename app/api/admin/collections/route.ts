import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/collections
 * List all collections with their articles.
 */
export async function GET() {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const collections = await prisma.collection.findMany({
      include: {
        articles: {
          include: { article: { select: { id: true, title: true, level: true, status: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({
      data: collections.map((c) => ({
        ...c,
        articles: c.articles.map((ca) => ({
          ...ca.article,
          order: ca.order,
        })),
      })),
    })
  } catch (error) {
    logger.error({ error }, 'Error listing collections')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/collections
 * Create a new collection.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const body = await request.json()
    const { name, description, displayOrder, articleIds } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 422 })
    }

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 422 })
    }

    if (description.length > 280) {
      return NextResponse.json({ error: 'Description must be 280 characters or less' }, { status: 422 })
    }

    // Auto-assign displayOrder if not provided
    const order = displayOrder ?? (
      await prisma.collection.aggregate({ _max: { displayOrder: true } })
    )._max.displayOrder ?? 0 + 1

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        displayOrder: order,
        articles: articleIds?.length
          ? {
              create: articleIds.map((articleId: string, idx: number) => ({
                articleId,
                order: idx,
              })),
            }
          : undefined,
      },
      include: {
        articles: {
          include: { article: { select: { id: true, title: true, level: true, status: true } } },
          orderBy: { order: 'asc' },
        },
      },
    })

    logger.info({ collectionId: collection.id, name: collection.name }, 'Collection created')

    return NextResponse.json({
      data: {
        ...collection,
        articles: collection.articles.map((ca) => ({
          ...ca.article,
          order: ca.order,
        })),
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error creating collection')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
