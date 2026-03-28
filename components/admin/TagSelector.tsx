'use client'

import { useEffect, useState } from 'react'

interface Tag {
  id: string
  name: string
  category: string
  articleCount: number
}

interface TagSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  topic: 'Topic',
  body_area: 'Body Area',
  context: 'Context',
}

export default function TagSelector({ selectedIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/tags')
      .then((res) => res.json())
      .then((json) => {
        setTags(json.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedIds, tagId])
    }
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading tags...</div>
  }

  const grouped = Object.groupBy(tags, (t) => t.category)

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Tags
      </label>
      <div className="space-y-3">
        {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
          const categoryTags = grouped[category] || []
          if (categoryTags.length === 0) return null

          return (
            <div key={category}>
              <span className="text-xs text-muted-foreground font-semibold">{label}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {categoryTags.map((tag) => {
                  const selected = selectedIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`text-xs px-2 py-1 border transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
