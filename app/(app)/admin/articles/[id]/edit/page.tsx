'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useReducer, useState } from 'react'
import ArticleEditor from '@/components/admin/ArticleEditor'

interface ArticleData {
  id: string
  title: string
  slug: string
  body: string
  level: string
  status: string
  reviewNote: string | null
  readTimeMinutes: number | null
  tags: { id: string; name: string; category: string }[]
}

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [article, setArticle] = useState<ArticleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, refresh] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/articles/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((json) => { if (!cancelled) { setArticle(json.data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Article not found'); setLoading(false) } })
    return () => { cancelled = true }
  }, [id, refreshKey])

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>
  if (error) return <div className="text-sm text-red-400">{error}</div>
  if (!article) return null

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">Edit Article</h1>
      {article.reviewNote && (
        <div className="mb-4 p-3 bg-yellow-900/20 border-2 border-yellow-700 text-yellow-400 text-sm">
          <strong>Review Note:</strong> {article.reviewNote}
        </div>
      )}
      <ArticleEditor
        article={article}
        onSave={() => refresh()}
        onCancel={() => router.push('/admin/articles')}
        onDelete={() => router.push('/admin/articles')}
      />
    </div>
  )
}
