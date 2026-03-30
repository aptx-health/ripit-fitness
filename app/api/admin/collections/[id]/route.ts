import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/collections/[id]
 * Get a single collection with articles.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        articles: {
          include: {
            article: {
              select: { id: true, title: true, slug: true, level: true, status: true, readTimeMinutes: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

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
    logger.error({ error }, 'Error fetching collection')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/collections/[id]
 * Update collection metadata and/or articles.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const { name, description, displayOrder, articleIds } = body

    const existing = await prisma.collection.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (description !== undefined && description.length > 280) {
      return NextResponse.json({ error: 'Description must be 280 characters or less' }, { status: 422 })
    }

    const collection = await prisma.$transaction(async (tx) => {
      // Replace articles if provided
      if (articleIds !== undefined) {
        await tx.collectionArticle.deleteMany({ where: { collectionId: id } })
        if (articleIds.length > 0) {
          await tx.collectionArticle.createMany({
            data: articleIds.map((articleId: string, idx: number) => ({
              collectionId: id,
              articleId,
              order: idx,
            })),
          })
        }
      }

      const data: Record<string, unknown> = {}
      if (name !== undefined) data.name = name.trim()
      if (description !== undefined) data.description = description.trim()
      if (displayOrder !== undefined) data.displayOrder = displayOrder

      return tx.collection.update({
        where: { id },
        data,
        include: {
          articles: {
            include: {
              article: { select: { id: true, title: true, level: true, status: true } },
            },
            orderBy: { order: 'asc' },
          },
        },
      })
    })

    logger.info({ collectionId: id, name: collection.name }, 'Collection updated')

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
    logger.error({ error }, 'Error updating collection')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/collections/[id]
 * Delete a collection (cascade removes article associations).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const existing = await prisma.collection.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    await prisma.collection.delete({ where: { id } })

    logger.info({ collectionId: id, name: existing.name }, 'Collection deleted')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error deleting collection')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
