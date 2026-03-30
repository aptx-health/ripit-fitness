'use client'

import { Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import MarkdownEditor from './MarkdownEditor'
import MediaUploader from './MediaUploader'
import TagSelector from './TagSelector'

interface Tag {
  id: string
  name: string
  category: string
}

interface ArticleData {
  id: string
  title: string
  slug: string
  body: string
  level: string
  status: string
  tags: Tag[]
}

interface ArticleEditorProps {
  article?: ArticleData | null
  onSave: (article: { id: string }) => void
  onCancel: () => void
  onDelete?: () => void
}

export default function ArticleEditor({ article, onSave, onCancel, onDelete }: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title || '')
  const [slug, setSlug] = useState(article?.slug || '')
  const [body, setBody] = useState(article?.body || '')
  const [level, setLevel] = useState(article?.level || 'beginner')
  const [status, setStatus] = useState(article?.status || 'draft')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(article?.tags?.map((t) => t.id) || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Auto-generate slug from title (unless manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && !article) {
      const generated = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generated)
    }
  }, [title, slugManuallyEdited, article])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      const payload = {
        title,
        slug,
        bodyContent: body,
        level,
        status,
        tagIds: selectedTagIds,
      }

      const url = article ? `/api/admin/articles/${article.id}` : '/api/admin/articles'
      const method = article ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to save')
        return
      }

      onSave(json.data)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }, [title, slug, body, level, status, selectedTagIds, article, onSave])

  const handleDelete = async () => {
    if (!article || !confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete?.()
      } else {
        const json = await res.json()
        setError(json.error || 'Failed to delete')
      }
    } catch {
      setError('Network error')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleMediaInsert = (markdown: string) => {
    setBody((prev) => `${prev}\n${markdown}`)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/20 border-2 border-red-700 text-red-400 text-sm">{error}</div>
      )}

      {/* Title + Slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Slug
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugManuallyEdited(true)
            }}
            placeholder="url-friendly-slug"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
        </label>
      </div>

      {/* Level + Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Level
          </span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        {article && (
          <label className="block">
            <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        )}
      </div>

      {/* Tags */}
      <TagSelector selectedIds={selectedTagIds} onChange={setSelectedTagIds} />

      {/* Media Upload */}
      <MediaUploader onInsert={handleMediaInsert} />

      {/* Markdown Editor */}
      <MarkdownEditor value={body} onChange={setBody} />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t-2 border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim() || !body.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saving ? 'Saving...' : article ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-muted text-foreground border-2 border-border hover:bg-secondary font-semibold uppercase tracking-wider text-sm transition-colors"
        >
          Cancel
        </button>
        {article && onDelete && (
          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-xs text-red-400">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-danger text-danger-foreground border-2 border-danger hover:bg-danger-hover font-semibold uppercase tracking-wider text-xs transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 bg-muted text-foreground border-2 border-border font-semibold uppercase tracking-wider text-xs transition-colors"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-red-400 border-2 border-red-700 hover:bg-red-900/20 font-semibold uppercase tracking-wider text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
