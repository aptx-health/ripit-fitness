'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useReducer, useState } from 'react'

interface Tag {
  id: string
  name: string
  category: string
  articleCount: number
}

const CATEGORIES = ['topic', 'body_area', 'context'] as const
const CATEGORY_LABELS: Record<string, string> = {
  topic: 'Topic',
  body_area: 'Body Area',
  context: 'Context',
}

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<string>('topic')
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const [refreshKey, refreshTags] = useReducer((x: number) => x + 1, 0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey triggers re-fetch intentionally
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/tags')
      .then((res) => res.json())
      .then((json) => { if (!cancelled) { setTags(json.data || []); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)

    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), category: newCategory }),
    })

    if (res.ok) {
      setNewName('')
      refreshTags()
    } else {
      const json = await res.json()
      setError(json.error)
    }
    setCreating(false)
  }

  const handleUpdate = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/admin/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, category: editCategory }),
    })

    if (res.ok) {
      setEditingId(null)
      refreshTags()
    } else {
      const json = await res.json()
      setError(json.error)
    }
  }

  const handleDelete = async (id: string, force = false) => {
    setError(null)
    const url = force ? `/api/admin/tags/${id}?force=true` : `/api/admin/tags/${id}`
    const res = await fetch(url, { method: 'DELETE' })

    if (res.ok) {
      refreshTags()
    } else {
      const json = await res.json()
      if (json.articleCount && !force) {
        if (confirm(`This tag is used by ${json.articleCount} article(s). Delete anyway?`)) {
          handleDelete(id, true)
        }
      } else {
        setError(json.error)
      }
    }
  }

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditCategory(tag.category)
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  const grouped = Object.groupBy(tags, (t) => t.category)

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/20 border-2 border-red-700 text-red-400 text-sm">{error}</div>
      )}

      {/* Create form */}
      <div className="flex items-end gap-3 p-4 bg-card border-2 border-border">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Name
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm mt-1"
            />
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Category
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="block px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm mt-1"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Tags by category */}
      {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
        const categoryTags = grouped[category] || []

        return (
          <div key={category}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {label} ({categoryTags.length})
            </h2>
            {categoryTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags in this category.</p>
            ) : (
              <div className="space-y-1">
                {categoryTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2 p-2 bg-card border border-border">
                    {editingId === tag.id ? (
                      <>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-2 py-1 bg-input border border-border text-foreground text-sm"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleUpdate(tag.id)} className="text-green-400 hover:text-green-300 p-1">
                          <Plus size={14} />
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground p-1">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-foreground">{tag.name}</span>
                        <span className="text-xs text-muted-foreground">{tag.articleCount} articles</span>
                        <button type="button" onClick={() => startEdit(tag)} className="text-muted-foreground hover:text-foreground p-1">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(tag.id)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
