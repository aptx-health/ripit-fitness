import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params

    // Find the article by slug
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Upsert read status: create if first read, update lastReadAt if already read
    await prisma.contentReadStatus.upsert({
      where: {
        userId_articleId: {
          userId: user.id,
          articleId: article.id,
        },
      },
      create: {
        userId: user.id,
        articleId: article.id,
      },
      update: {
        lastReadAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ error: err, context: 'article-mark-read' }, 'Failed to mark article as read')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
