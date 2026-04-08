'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Tag {
  id: string
  name: string
  category: string
}

interface Article {
  id: string
  title: string
  slug: string
  level: string
  status: string
  readTimeMinutes: number | null
  publishedAt: string | null
  updatedAt: string
  tags: Tag[]
  readCount: number
  commentCount: number
}

const STATUS_TABS = ['all', 'draft', 'pending_review', 'published', 'rejected'] as const

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [search, setSearch] = useState('')

  const searchKey = `${activeStatus}-${search}`
  const [prevSearchKey, setPrevSearchKey] = useState(searchKey)
  if (prevSearchKey !== searchKey) {
    setPrevSearchKey(searchKey)
    setLoading(true)
  }

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (activeStatus !== 'all') params.set('status', activeStatus)
    if (search.trim()) params.set('search', search.trim())

    fetch(`/api/admin/articles?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setArticles(json.data || [])
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [activeStatus, search])

  const statusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-800 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700'
      case 'draft': return 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-600'
      case 'pending_review': return 'text-yellow-800 bg-yellow-100 border-yellow-300 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700'
      case 'rejected': return 'text-red-800 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700'
      default: return 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-600'
    }
  }

  const levelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-400 border-green-700'
      case 'intermediate': return 'text-yellow-400 border-yellow-700'
      case 'advanced': return 'text-red-400 border-red-700'
      default: return 'text-zinc-400 border-zinc-600'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          New Article
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="w-full max-w-md px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveStatus(tab)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
              activeStatus === tab
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Article list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : articles.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No articles found. Create your first article to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/admin/articles/${article.id}/edit`}
              className="block p-4 bg-card border-2 border-border hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{article.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 border ${statusColor(article.status)} font-semibold uppercase`}>
                      {article.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 border ${levelColor(article.level)} font-semibold uppercase`}>
                      {article.level}
                    </span>
                    {article.readTimeMinutes && (
                      <span className="text-xs text-muted-foreground">
                        {article.readTimeMinutes} min read
                      </span>
                    )}
                  </div>
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {article.tags.map((tag) => (
                        <span key={tag.id} className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{new Date(article.updatedAt).toLocaleDateString()}</div>
                  <div className="mt-1">{article.readCount} reads</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
