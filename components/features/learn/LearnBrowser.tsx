'use client'

import { BookOpen, Clock, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'

interface Tag {
  id: string
  name: string
  category: string
}

interface ArticleCard {
  id: string
  title: string
  slug: string
  level: string
  readTimeMinutes: number | null
  publishedAt: string | null
  tags: Tag[]
  readStatus: { lastReadAt: string } | null
}

interface CollectionData {
  id: string
  name: string
  description: string
  readCount: number
  totalCount: number
}

type FilterCategory = 'topic' | 'body_area' | 'context'

const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const
const FILTER_CATEGORIES: { key: FilterCategory; label: string }[] = [
  { key: 'topic', label: 'Topic' },
  { key: 'body_area', label: 'Body Area' },
  { key: 'context', label: 'Context' },
]

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

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}

export default function LearnBrowser() {
  const [articles, setArticles] = useState<ArticleCard[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [search, setSearch] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<Record<FilterCategory, string[]>>({
    topic: [],
    body_area: [],
    context: [],
  })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const fetchArticles = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      for (const level of selectedLevels) {
        params.append('level', level)
      }
      for (const [category, names] of Object.entries(selectedTags)) {
        for (const name of names) {
          params.append(category, name)
        }
      }

      const res = await fetch(`/api/articles?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch articles')
      const data = await res.json()
      setArticles(data.articles || [])
      setAllTags(data.tags || [])
      setCollections(data.collections || [])
    } catch (err) {
      clientLogger.error('Failed to fetch articles:', err)
    } finally {
      setLoading(false)
    }
  }, [search, selectedLevels, selectedTags])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticles()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchArticles, search])

  function toggleLevel(level: string) {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }

  function toggleTag(category: FilterCategory, name: string) {
    setSelectedTags((prev) => ({
      ...prev,
      [category]: prev[category].includes(name)
        ? prev[category].filter((n) => n !== name)
        : [...prev[category], name],
    }))
  }

  function clearFilters() {
    setSelectedLevels([])
    setSelectedTags({ topic: [], body_area: [], context: [] })
    setSearch('')
  }

  const hasActiveFilters =
    selectedLevels.length > 0 ||
    Object.values(selectedTags).some((arr) => arr.length > 0)

  const tagsByCategory = (category: FilterCategory) =>
    allTags.filter((t) => t.category === category)

  return (
    <div className="bg-background doom-page-enter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
            LEARN
          </h1>
          <p className="text-muted-foreground mt-1">
            Articles and guides to help you get the most out of your training.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-card border-2 border-border
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle + active filter pills */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`text-xs px-3 py-1.5 border-2 transition-colors font-semibold uppercase tracking-wider ${
              showFilters || hasActiveFilters
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Filters {hasActiveFilters && `(${selectedLevels.length + Object.values(selectedTags).flat().length})`}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-card border-2 border-border doom-noise space-y-4">
            {/* Level filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Level
              </p>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`text-xs px-3 py-1 border-2 transition-colors capitalize font-medium ${
                      selectedLevels.includes(level)
                        ? levelColor(level)
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag category filters */}
            {FILTER_CATEGORIES.map(({ key, label }) => {
              const tags = tagsByCategory(key)
              if (tags.length === 0) return null
              return (
                <div key={key}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTag(key, tag.name)}
                        className={`text-xs px-3 py-1 border-2 transition-colors font-medium ${
                          selectedTags[key].includes(tag.name)
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Collections section */}
        {!search && !hasActiveFilters && collections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-foreground mb-3 doom-heading uppercase tracking-wider">
              Collections
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collections.map((col) => {
                const isComplete = col.readCount === col.totalCount && col.totalCount > 0
                const progressPercent = col.totalCount > 0 ? (col.readCount / col.totalCount) * 100 : 0
                return (
                  <Link
                    key={col.id}
                    href={`/learn/collections/${col.id}`}
                    className={`block bg-card border-2 p-4 doom-noise doom-corners transition-all group ${
                      isComplete
                        ? 'border-green-900/50 hover:border-green-700'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                        {col.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${
                          isComplete ? 'text-green-400' : 'text-muted-foreground'
                        }`}
                      >
                        {col.readCount}/{col.totalCount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {col.description}
                    </p>
                    {/* Progress bar */}
                    <div className="h-1 bg-muted border border-border overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isComplete
                            ? 'bg-green-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Browse section */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 doom-heading uppercase tracking-wider">
            {search || hasActiveFilters ? 'Results' : 'Browse'}
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center doom-noise doom-corners">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search || hasActiveFilters
                  ? 'No articles match your search.'
                  : 'No articles published yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {articles.map((article) => (
                <ArticleCardItem key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ArticleCardItem({ article }: { article: ArticleCard }) {
  return (
    <Link
      href={`/learn/${article.slug}`}
      className="block bg-card border border-border p-4 doom-corners
        hover:border-primary/50 hover:shadow-md transition group"
    >
      {/* Header: level badge + read status */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider doom-label ${levelColor(article.level)}`}
        >
          {article.level}
        </span>
        {article.readStatus ? (
          <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">
            Read {relativeTime(article.readStatus.lastReadAt)}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {article.title}
      </h3>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {article.tags.slice(0, 4).map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border border-border"
            >
              {tag.name}
            </span>
          ))}
          {article.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">
              +{article.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Read time */}
      {article.readTimeMinutes && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{article.readTimeMinutes} min read</span>
        </div>
      )}
    </Link>
  )
}
