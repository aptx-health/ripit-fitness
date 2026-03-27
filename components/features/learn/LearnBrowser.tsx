'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, BookOpen, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
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
  articles: {
    article: {
      id: string
      title: string
      slug: string
      level: string
      readTimeMinutes: number | null
    }
  }[]
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
      return 'bg-green-900/40 text-green-400 border border-green-700'
    case 'intermediate':
      return 'bg-orange-900/40 text-orange-400 border border-orange-700'
    case 'advanced':
      return 'bg-red-900/40 text-red-400 border border-red-700'
    default:
      return 'bg-zinc-700 text-zinc-300'
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
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold mb-1 text-orange-50">Learn</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Articles and guides to help you get the most out of your training.
        </p>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg
              text-sm text-orange-50 placeholder:text-zinc-500
              focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle + active filter pills */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-orange-600/20 border-orange-600 text-orange-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Filters {hasActiveFilters && `(${selectedLevels.length + Object.values(selectedTags).flat().length})`}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-4">
            {/* Level filter */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                Level
              </p>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                      selectedLevels.includes(level)
                        ? levelColor(level)
                        : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:text-zinc-300'
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
                  <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(key, tag.name)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          selectedTags[key].includes(tag.name)
                            ? 'bg-orange-600/20 border-orange-600 text-orange-400'
                            : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:text-zinc-300'
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
            <h2 className="text-sm font-semibold text-orange-50 mb-3 uppercase tracking-wide">
              Collections
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                >
                  <h3 className="text-sm font-semibold text-orange-50 mb-1">
                    {col.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3 line-clamp-2">
                    {col.description}
                  </p>
                  <div className="space-y-1">
                    {col.articles.map(({ article }) => (
                      <Link
                        key={article.id}
                        href={`/learn/${article.slug}`}
                        className="flex items-center gap-2 text-xs text-zinc-300 hover:text-orange-400 transition-colors"
                      >
                        <ChevronRight className="h-3 w-3 text-zinc-500" />
                        <span className="truncate">{article.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse section */}
        <div>
          <h2 className="text-sm font-semibold text-orange-50 mb-3 uppercase tracking-wide">
            {search || hasActiveFilters ? 'Results' : 'Browse'}
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-400">
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
      className="block bg-zinc-800 border border-zinc-700 rounded-lg p-4
        hover:border-orange-600/50 hover:bg-zinc-800/80 transition-colors group"
    >
      {/* Header: level badge + read status */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${levelColor(article.level)}`}
        >
          {article.level}
        </span>
        {article.readStatus ? (
          <span className="text-[10px] text-green-400 font-medium">
            Read {relativeTime(article.readStatus.lastReadAt)}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-orange-50 mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
        {article.title}
      </h3>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {article.tags.slice(0, 4).map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300"
            >
              {tag.name}
            </span>
          ))}
          {article.tags.length > 4 && (
            <span className="text-[10px] text-zinc-500">
              +{article.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Read time */}
      {article.readTimeMinutes && (
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>{article.readTimeMinutes} min read</span>
        </div>
      )}
    </Link>
  )
}
