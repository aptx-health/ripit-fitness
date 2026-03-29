import { redirect } from 'next/navigation'
import ArticleDetail from '@/components/features/learn/ArticleDetail'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ collection?: string }>
}) {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    redirect('/login')
  }

  const { slug } = await params
  const { collection: collectionId } = await searchParams

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

  // If opened from a collection, fetch collection context for prev/next nav
  let collectionContext: {
    id: string
    name: string
    articles: { slug: string; title: string }[]
    currentIndex: number
  } | null = null

  if (collectionId) {
    try {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        select: {
          id: true,
          name: true,
          articles: {
            orderBy: { order: 'asc' },
            select: {
              article: {
                select: {
                  slug: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      if (collection) {
        const publishedArticles = collection.articles
          .filter((ca) => ca.article.status === 'published')
          .map((ca) => ({
            slug: ca.article.slug,
            title: ca.article.title,
          }))

        const currentIndex = publishedArticles.findIndex((a) => a.slug === slug)

        if (currentIndex !== -1) {
          collectionContext = {
            id: collection.id,
            name: collection.name,
            articles: publishedArticles,
            currentIndex,
          }
        }
      }
    } catch (err) {
      logger.error({ error: err, context: 'article-collection-context' }, 'Failed to fetch collection context')
    }
  }

  const tagIds = article.tags.map((at) => at.tag.id)

  // Find related articles sharing at least one tag (skip if in collection context)
  let relatedArticles: {
    id: string
    title: string
    slug: string
    level: string
    readTimeMinutes: number | null
  }[] = []

  if (!collectionContext && tagIds.length > 0) {
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
      collectionContext={collectionContext}
    />
  )
}
