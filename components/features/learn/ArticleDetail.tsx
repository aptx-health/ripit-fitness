'use client'

import { ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
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

interface ArticleDetailProps {
  article: ArticleData
  relatedArticles: RelatedArticle[]
}

function levelColor(level: string) {
  switch (level) {
    case 'beginner':
      return 'bg-green-900/40 text-green-400 border-2 border-green-700'
    case 'intermediate':
      return 'bg-orange-900/40 text-orange-400 border-2 border-orange-700'
    case 'advanced':
      return 'bg-red-900/40 text-red-400 border-2 border-red-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function ArticleDetail({ article, relatedArticles }: ArticleDetailProps) {
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

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back navigation */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-6 uppercase tracking-wider font-semibold"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Learn
        </Link>

        {/* Article header */}
        <div className="mb-6">
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.body}
          </ReactMarkdown>
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
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
    </div>
  )
}
