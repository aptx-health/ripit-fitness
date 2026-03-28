'use client'

import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useReducer, useState } from 'react'

interface CollectionArticle {
  id: string
  title: string
  level: string
  status: string
  order: number
}

interface Collection {
  id: string
  name: string
  description: string
  displayOrder: number
  articles: CollectionArticle[]
}

interface AvailableArticle {
  id: string
  title: string
  level: string
  status: string
}

export default function CollectionBuilder() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)

  // Available articles for picker
  const [availableArticles, setAvailableArticles] = useState<AvailableArticle[]>([])

  const [refreshKey, refreshCollections] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/collections').then((r) => r.json()),
      fetch('/api/admin/articles?limit=100').then((r) => r.json()),
    ])
      .then(([colJson, artJson]) => {
        if (!cancelled) {
          setCollections(colJson.data || [])
          setAvailableArticles(artJson.data || [])
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  const handleCreate = async () => {
    if (!newName.trim() || !newDescription.trim()) return
    setCreating(true)
    setError(null)

    const res = await fetch('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
    })

    if (res.ok) {
      setNewName('')
      setNewDescription('')
      setShowCreate(false)
      refreshCollections()
    } else {
      const json = await res.json()
      setError(json.error)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return
    const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' })
    if (res.ok) {
      refreshCollections()
    } else {
      const json = await res.json()
      setError(json.error)
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/20 border-2 border-red-700 text-red-400 text-sm">{error}</div>
      )}

      <button
        type="button"
        onClick={() => setShowCreate(!showCreate)}
        className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors"
      >
        <Plus size={16} />
        New Collection
      </button>

      {showCreate && (
        <div className="p-4 bg-card border-2 border-border space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Collection name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Description ({newDescription.length}/280)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value.slice(0, 280))}
              className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none h-20"
              placeholder="Short description"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newDescription.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary font-semibold uppercase tracking-wider text-xs disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-muted text-foreground border-2 border-border font-semibold uppercase tracking-wider text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No collections yet. Create one to group articles together.
        </p>
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              isEditing={editingId === collection.id}
              onEdit={() => setEditingId(editingId === collection.id ? null : collection.id)}
              onDelete={() => handleDelete(collection.id)}
              onUpdate={refreshCollections}
              availableArticles={availableArticles}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CollectionCard({
  collection,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  availableArticles,
}: {
  collection: Collection
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onUpdate: () => void
  availableArticles: AvailableArticle[]
}) {
  const collectionKey = `${collection.id}-${collection.articles.map((a) => a.id).join(',')}`
  const [articleIds, setArticleIds] = useState<string[]>(
    collection.articles.map((a) => a.id)
  )
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description)

  // Reset local state when collection data changes (from server refresh)
  const [prevKey, setPrevKey] = useState(collectionKey)
  if (prevKey !== collectionKey) {
    setPrevKey(collectionKey)
    setArticleIds(collection.articles.map((a) => a.id))
    setName(collection.name)
    setDescription(collection.description)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/admin/collections/${collection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, articleIds }),
    })
    setSaving(false)
    onUpdate()
    onEdit()
  }

  const moveArticle = (index: number, direction: -1 | 1) => {
    const newIds = [...articleIds]
    const target = index + direction
    if (target < 0 || target >= newIds.length) return
    ;[newIds[index], newIds[target]] = [newIds[target], newIds[index]]
    setArticleIds(newIds)
  }

  const removeArticle = (id: string) => {
    setArticleIds(articleIds.filter((a) => a !== id))
  }

  const addArticle = (id: string) => {
    if (!articleIds.includes(id)) {
      setArticleIds([...articleIds, id])
    }
  }

  const unusedArticles = availableArticles.filter((a) => !articleIds.includes(a.id))

  return (
    <div className="border-2 border-border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2 py-1 bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 280))}
                className="w-full px-2 py-1 bg-input border border-border text-foreground text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-foreground">{collection.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{collection.description}</p>
              <span className="text-xs text-muted-foreground">{collection.articles.length} articles</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 ml-4">
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-2">
            {isEditing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-2">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 p-2">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-border p-4 space-y-3">
          {/* Current articles with reorder */}
          <div className="space-y-1">
            {articleIds.map((id, index) => {
              const article = availableArticles.find((a) => a.id === id) ||
                collection.articles.find((a) => a.id === id)
              return (
                <div key={id} className="flex items-center gap-2 p-2 bg-muted border border-border text-sm">
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <span className="flex-1 truncate text-foreground">{article?.title || id}</span>
                  <button onClick={() => moveArticle(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1">
                    <ArrowUp size={12} />
                  </button>
                  <button onClick={() => moveArticle(index, 1)} disabled={index === articleIds.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1">
                    <ArrowDown size={12} />
                  </button>
                  <button onClick={() => removeArticle(id)} className="text-red-400 hover:text-red-300 p-1">
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add article picker */}
          {unusedArticles.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Add article
              </span>
              <div className="mt-1 max-h-40 overflow-y-auto space-y-1">
                {unusedArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => addArticle(article.id)}
                    className="w-full text-left p-2 bg-muted border border-border hover:bg-secondary text-sm text-foreground transition-colors flex items-center gap-2"
                  >
                    <Plus size={12} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{article.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{article.level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary font-semibold uppercase tracking-wider text-xs disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-muted text-foreground border-2 border-border font-semibold uppercase tracking-wider text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
