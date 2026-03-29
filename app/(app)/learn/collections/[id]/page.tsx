import { redirect } from 'next/navigation'
import CollectionDetail from '@/components/features/learn/CollectionDetail'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    redirect('/login')
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
    redirect('/learn')
  }

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

  return (
    <CollectionDetail
      collection={{
        id: collection.id,
        name: collection.name,
        description: collection.description,
      }}
      articles={articles}
      readCount={articles.filter((a) => a.isRead).length}
      totalCount={articles.length}
    />
  )
}
