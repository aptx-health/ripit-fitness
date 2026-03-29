import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import ArticleDetail from '@/components/features/learn/ArticleDetail'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    redirect('/login')
  }

  const { slug } = await params

  const article = await prisma.article.findUnique({
    where: { slug, status: 'published' },
    select: {
      id: true,
      title: true,
      slug: true,
      body: true,
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
    },
  })

  if (!article) {
    redirect('/learn')
  }

  const tagIds = article.tags.map((at) => at.tag.id)

  // Find related articles sharing at least one tag
  let relatedArticles: {
    id: string
    title: string
    slug: string
    level: string
    readTimeMinutes: number | null
  }[] = []

  if (tagIds.length > 0) {
    try {
      relatedArticles = await prisma.article.findMany({
        where: {
          status: 'published',
          id: { not: article.id },
          tags: {
            some: {
              tagId: { in: tagIds },
            },
          },
        },
        take: 4,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          level: true,
          readTimeMinutes: true,
        },
      })
    } catch (err) {
      logger.error({ error: err, context: 'article-related' }, 'Failed to fetch related articles')
    }
  }

  // Flatten tags for the client component
  const formattedArticle = {
    ...article,
    tags: article.tags.map((at) => at.tag),
    publishedAt: article.publishedAt?.toISOString() ?? null,
  }

  return (
    <ArticleDetail
      article={formattedArticle}
      relatedArticles={relatedArticles}
    />
  )
}
