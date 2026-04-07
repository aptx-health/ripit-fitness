'use client'

import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { clientLogger } from '@/lib/client-logger'

interface Tag {
  id: string
  name: string
  category: string
}

interface RelatedArticle {
  id: string
  title: string
  slug: string
  level: string
  readTimeMinutes: number | null
}

interface ArticleData {
  id: string
  title: string
  slug: string
  body: string
  level: string
  readTimeMinutes: number | null
  publishedAt: string | null
  tags: Tag[]
}

interface CollectionContext {
  id: string
  name: string
  articles: { slug: string; title: string }[]
  currentIndex: number
}

interface ArticleDetailProps {
  article: ArticleData
  relatedArticles: RelatedArticle[]
  collectionContext?: CollectionContext | null
}

function levelColor(level: string) {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800 border-2 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
    case 'intermediate':
      return 'bg-orange-100 text-orange-800 border-2 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700'
    case 'advanced':
      return 'bg-red-100 text-red-800 border-2 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function ArticleDetail({
  article,
  relatedArticles,
  collectionContext,
}: ArticleDetailProps) {
  // Auto-mark as read when article is viewed
  useEffect(() => {
    async function markRead() {
      try {
        await fetch(`/api/articles/${article.slug}/read`, { method: 'POST' })
      } catch (err) {
        clientLogger.error('Failed to mark article as read:', err)
      }
    }
    markRead()
  }, [article.slug])

  const prevArticle = collectionContext && collectionContext.currentIndex > 0
    ? collectionContext.articles[collectionContext.currentIndex - 1]
    : null
  const nextArticle = collectionContext && collectionContext.currentIndex < collectionContext.articles.length - 1
    ? collectionContext.articles[collectionContext.currentIndex + 1]
    : null

  const backHref = collectionContext
    ? `/learn/collections/${collectionContext.id}`
    : '/learn'

  return (
    <div className={`bg-background px-4 sm:px-6 py-8 ${collectionContext ? 'pb-24 sm:pb-8' : ''}`}>
      <div className="max-w-2xl mx-auto">

        {/* Mobile: floating back button (top-left, mirrors draft button pattern) */}
        {collectionContext ? (
          <Link
            href={backHref}
            className="sm:hidden fixed left-3 flex items-center gap-2 px-3 py-2
              bg-card border-2 border-border text-foreground
              shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
              zIndex: 45,
            }}
            aria-label={`Back to ${collectionContext.name}`}
          >
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider max-w-[120px] truncate">
              {collectionContext.name}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {collectionContext.currentIndex + 1}/{collectionContext.articles.length}
            </span>
          </Link>
        ) : (
          <Link
            href={backHref}
            className="sm:hidden fixed left-3 flex items-center justify-center
              min-h-10 min-w-10 bg-card border-2 border-border text-muted-foreground
              shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
              zIndex: 45,
            }}
            aria-label="Back to Learn"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}

        {/* Desktop: inline breadcrumb nav */}
        <div className="hidden sm:block mb-6">
          {collectionContext ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 px-3 py-1.5
                bg-card border-2 border-border text-foreground
                hover:border-primary/50 transition-all group"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-primary transition-colors">
                {collectionContext.name}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {collectionContext.currentIndex + 1}/{collectionContext.articles.length}
              </span>
            </Link>
          ) : (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground
                hover:text-primary transition-colors uppercase tracking-wider font-semibold"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Learn
            </Link>
          )}
        </div>

        {/* Article header */}
        <div className="mb-6 mt-14 sm:mt-0">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider doom-label ${levelColor(article.level)}`}
            >
              {article.level}
            </span>
            {article.readTimeMinutes && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {article.readTimeMinutes} min read
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3 doom-heading uppercase tracking-wider">
            {article.title}
          </h1>

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border border-border"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Article body - markdown */}
        <div className="prose-learn mb-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {article.body}
          </ReactMarkdown>
        </div>

        {/* Collection prev/next — inline for desktop */}
        {collectionContext && (
          <div className="hidden sm:flex border-t-2 border-border pt-6 mb-8 items-stretch gap-3">
            {prevArticle ? (
              <Link
                href={`/learn/${prevArticle.slug}?collection=${collectionContext.id}`}
                className="flex-1 flex items-center gap-3 p-4 bg-card border-2 border-border
                  hover:border-primary/50 transition-all group"
              >
                <ChevronLeft className="h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Previous
                  </span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate block">
                    {prevArticle.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextArticle ? (
              <Link
                href={`/learn/${nextArticle.slug}?collection=${collectionContext.id}`}
                className="flex-1 flex items-center justify-end gap-3 p-4 bg-card border-2 border-border
                  hover:border-primary/50 transition-all group text-right"
              >
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Next
                  </span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate block">
                    {nextArticle.title}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ) : (
              <Link
                href={`/learn/collections/${collectionContext.id}`}
                className="flex-1 flex items-center justify-end gap-3 p-4 bg-card border-2 border-green-900/50
                  hover:border-green-700 transition-all group text-right"
              >
                <div className="min-w-0">
                  <span className="text-[10px] text-green-400 uppercase tracking-wider font-semibold block">
                    Complete
                  </span>
                  <span className="text-sm font-semibold text-green-400 group-hover:text-green-300 transition-colors truncate block">
                    Back to Collection
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-green-400 group-hover:text-green-300 transition-colors" />
              </Link>
            )}
          </div>
        )}

        {/* Related articles — only shown outside collection context */}
        {!collectionContext && relatedArticles.length > 0 && (
          <div className="border-t-2 border-border pt-8">
            <h2 className="text-sm font-bold text-foreground mb-4 doom-heading uppercase tracking-wider">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/learn/${related.slug}`}
                  className="block bg-card border border-border p-3 doom-corners
                    hover:border-primary/50 hover:shadow-md transition"
                >
                  <span
                    className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider doom-label ${levelColor(related.level)}`}
                  >
                    {related.level}
                  </span>
                  <h3 className="text-sm font-medium text-foreground mt-2 line-clamp-2">
                    {related.title}
                  </h3>
                  {related.readTimeMinutes && (
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {related.readTimeMinutes} min read
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile fixed bottom nav — collection prev/next */}
      {collectionContext && (
        <div className="fixed bottom-16 left-0 right-0 sm:hidden bg-card border-t-2 border-border z-40">
          <div className="flex items-stretch">
            {prevArticle ? (
              <Link
                href={`/learn/${prevArticle.slug}?collection=${collectionContext.id}`}
                className="flex-1 flex items-center gap-2 px-4 py-3 border-r border-border
                  active:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Prev
                  </span>
                  <span className="text-xs text-foreground truncate block">
                    {prevArticle.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex-1 px-4 py-3 border-r border-border" />
            )}

            {/* Position indicator */}
            <div className="flex items-center px-3">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider whitespace-nowrap">
                {collectionContext.currentIndex + 1}/{collectionContext.articles.length}
              </span>
            </div>

            {nextArticle ? (
              <Link
                href={`/learn/${nextArticle.slug}?collection=${collectionContext.id}`}
                className="flex-1 flex items-center justify-end gap-2 px-4 py-3 border-l border-border
                  active:bg-muted transition-colors"
              >
                <div className="min-w-0 text-right">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Next
                  </span>
                  <span className="text-xs text-foreground truncate block">
                    {nextArticle.title}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-primary" />
              </Link>
            ) : (
              <Link
                href={`/learn/collections/${collectionContext.id}`}
                className="flex-1 flex items-center justify-end gap-2 px-4 py-3 border-l border-border
                  active:bg-muted transition-colors"
              >
                <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">
                  Done
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-green-400" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
