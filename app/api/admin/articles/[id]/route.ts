import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { calculateReadTime, generateSlug } from '@/lib/admin/slug'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/articles/[id]
 * Get a single article with all relations.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        collectionArticles: { include: { collection: true } },
        _count: { select: { readStatuses: true, comments: true } },
      },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...article,
        tags: article.tags.map((at) => at.tag),
        collections: article.collectionArticles.map((ca) => ca.collection),
        readCount: article._count.readStatuses,
        commentCount: article._count.comments,
        _count: undefined,
        collectionArticles: undefined,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error fetching article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/articles/[id]
 * Update an article.
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
    const { title, slug: providedSlug, bodyContent, level, tagIds, status: articleStatus, reviewNote } = body

    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Build update data
    const data: Record<string, unknown> = {}

    if (title !== undefined) {
      data.title = title.trim()
      if (!providedSlug) {
        data.slug = generateSlug(title)
      }
    }

    if (providedSlug !== undefined) {
      // Check slug uniqueness (exclude current article)
      const slugConflict = await prisma.article.findFirst({
        where: { slug: providedSlug, id: { not: id } },
      })
      if (slugConflict) {
        return NextResponse.json({ error: 'An article with this slug already exists' }, { status: 409 })
      }
      data.slug = providedSlug
    }

    if (bodyContent !== undefined) {
      data.body = bodyContent
      data.readTimeMinutes = calculateReadTime(bodyContent)
    }

    if (level !== undefined) data.level = level
    if (reviewNote !== undefined) data.reviewNote = reviewNote

    if (articleStatus !== undefined) {
      // Non-admin cannot publish directly
      if (auth.user.role !== 'admin' && articleStatus === 'published') {
        data.status = 'pending_review'
      } else {
        data.status = articleStatus
      }

      if (data.status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date()
      }
    }

    // Update article + replace tags in a transaction
    const article = await prisma.$transaction(async (tx) => {
      if (tagIds !== undefined) {
        await tx.articleTag.deleteMany({ where: { articleId: id } })
        if (tagIds.length > 0) {
          await tx.articleTag.createMany({
            data: tagIds.map((tagId: string) => ({ articleId: id, tagId })),
          })
        }
      }

      return tx.article.update({
        where: { id },
        data,
        include: { tags: { include: { tag: true } } },
      })
    })

    logger.info({ articleId: id, changes: Object.keys(data) }, 'Article updated')

    return NextResponse.json({
      data: { ...article, tags: article.tags.map((at) => at.tag) },
    })
  } catch (error) {
    logger.error({ error }, 'Error updating article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/articles/[id]
 * Delete an article (cascade deletes tags, read statuses, etc.).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    await prisma.article.delete({ where: { id } })

    logger.info({ articleId: id, title: existing.title }, 'Article deleted')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error deleting article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
