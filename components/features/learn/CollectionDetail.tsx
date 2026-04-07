'use client'

import { ArrowLeft, Check, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'

interface CollectionArticle {
  id: string
  title: string
  slug: string
  level: string
  readTimeMinutes: number | null
  order: number
  isRead: boolean
}

interface CollectionDetailProps {
  collection: {
    id: string
    name: string
    description: string
  }
  articles: CollectionArticle[]
  readCount: number
  totalCount: number
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

export default function CollectionDetail({
  collection,
  articles,
  readCount,
  totalCount,
}: CollectionDetailProps) {
  const progressPercent = totalCount > 0 ? (readCount / totalCount) * 100 : 0
  const isComplete = readCount === totalCount && totalCount > 0

  // Find the first unread article for "Continue" button
  const nextUnread = articles.find((a) => !a.isRead)

  return (
    <div className="bg-background doom-page-enter">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Mobile: floating back button */}
        <Link
          href="/learn"
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

        {/* Desktop: inline back link */}
        <Link
          href="/learn"
          className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground
            hover:text-primary transition-colors mb-6 uppercase tracking-wider font-semibold"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Learn
        </Link>

        {/* Collection header */}
        <div className="bg-card border-2 border-border p-6 doom-noise doom-corners mb-6 mt-14 sm:mt-0">
          <h1 className="text-2xl font-bold text-foreground doom-title uppercase tracking-wider mb-2">
            {collection.name}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {collection.description}
          </p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Progress
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isComplete ? 'text-green-400' : 'text-foreground'
                }`}
              >
                {readCount} of {totalCount} read
              </span>
            </div>
            <div className="h-2 bg-muted border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isComplete
                    ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                    : 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Continue reading button */}
          {nextUnread && (
            <Link
              href={`/learn/${nextUnread.slug}?collection=${collection.id}`}
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-primary text-primary-foreground
                text-xs font-bold uppercase tracking-wider doom-button-3d
                hover:bg-primary/90 transition-colors"
            >
              {readCount === 0 ? 'Start Reading' : 'Continue Reading'}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Article list */}
        <div className="space-y-2">
          {articles.map((article, index) => (
            <Link
              key={article.id}
              href={`/learn/${article.slug}?collection=${collection.id}`}
              className={`flex items-center gap-3 p-4 border-2 transition-all group ${
                article.isRead
                  ? 'bg-card border-green-900/50 hover:border-green-700'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              {/* Number / check indicator */}
              <div
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center border-2
                  text-xs font-bold ${
                    article.isRead
                      ? 'bg-green-900/40 border-green-700 text-green-400'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
              >
                {article.isRead ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Article info */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-semibold truncate transition-colors ${
                    article.isRead
                      ? 'text-muted-foreground group-hover:text-green-400'
                      : 'text-foreground group-hover:text-primary'
                  }`}
                >
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 font-semibold uppercase tracking-wider ${levelColor(article.level)}`}
                  >
                    {article.level}
                  </span>
                  {article.readTimeMinutes && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {article.readTimeMinutes} min
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  article.isRead
                    ? 'text-green-700 group-hover:text-green-400'
                    : 'text-muted-foreground group-hover:text-primary'
                }`}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
