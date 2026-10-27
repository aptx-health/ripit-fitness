'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'

type TagRow = { id: string; name: string; articleCount: number }
type CollectionRow = { id: string; name: string; articles: unknown[] }
type ArticleRow = { id: string; title: string; status: string; tags: unknown[] }

/**
 * Tags and Collections aren't destinations you visit — they're things you
 * touch while working on an article. Desktop-only, ≥1280px (see the
 * article page's xl: wrapper); below that the sidebar links are the only path.
 */
export default function AdjacencyRail() {
  const [tags, setTags] = useState<TagRow[]>([])
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [untaggedCount, setUntaggedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/tags').then((r) => r.json()),
      fetch('/api/admin/collections').then((r) => r.json()),
      fetch('/api/admin/articles?status=published').then((r) => r.json()),
    ])
      .then(([tagsJson, collectionsJson, articlesJson]) => {
        if (cancelled) return
        const tagRows: TagRow[] = (tagsJson.data || [])
          .filter((t: TagRow) => t.articleCount > 0)
          .sort((a: TagRow, b: TagRow) => b.articleCount - a.articleCount)
        setTags(tagRows)
        setCollections(collectionsJson.data || [])
        const published: ArticleRow[] = articlesJson.data || []
        setUntaggedCount(published.filter((a) => a.tags.length === 0).length)
      })
      .catch((err) => clientLogger.error('Failed to load adjacency rail data', err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside className="hidden xl:block w-[312px] shrink-0 border-l-2 border-border pl-6 space-y-6">
      {!loading && untaggedCount > 0 && (
        <div className="flex gap-2 p-3 bg-accent-muted border-l-[3px] border-accent">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-accent" />
          <p className="text-xs text-foreground">
            {untaggedCount} published {untaggedCount === 1 ? 'article has' : 'articles have'} no tags.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="doom-label text-secondary">Tags in Use</h3>
          <Link href="/admin/tags" className="text-xs font-semibold text-primary hover:text-primary-hover">
            Manage &rsaquo;
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-muted text-muted-foreground border border-border"
            >
              {tag.name} <span className="text-foreground">{tag.articleCount}</span>
            </span>
          ))}
          {!loading && tags.length === 0 && (
            <p className="text-xs text-muted-foreground">No tags in use yet.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="doom-label text-secondary">Collections</h3>
          <Link href="/admin/collections" className="text-xs font-semibold text-primary hover:text-primary-hover">
            Manage &rsaquo;
          </Link>
        </div>
        <div className="space-y-1.5">
          {collections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-2.5 py-1.5 border border-border text-sm text-foreground"
            >
              <span className="truncate">{c.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.articles.length}</span>
            </div>
          ))}
          {!loading && collections.length === 0 && (
            <p className="text-xs text-muted-foreground">No collections yet.</p>
          )}
        </div>
      </div>
    </aside>
  )
}
