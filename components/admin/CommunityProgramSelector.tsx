'use client'

import { useEffect, useState } from 'react'

interface CommunityProgram {
  id: string
  name: string
  level: string | null
}

interface CommunityProgramSelectorProps {
  selectedIds: Set<string>
  onChange: (selectedIds: Set<string>) => void
}

export function CommunityProgramSelector({ selectedIds, onChange }: CommunityProgramSelectorProps) {
  const [programs, setPrograms] = useState<CommunityProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/community-programs')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setPrograms(json.data || [])
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleToggle = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    onChange(next)
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading programs...</div>
  }

  if (programs.length === 0) {
    return <div className="text-sm text-muted-foreground">No community programs found.</div>
  }

  return (
    <div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto border-2 border-border p-3 bg-input">
        {programs.map((prog) => (
          <label key={prog.id} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedIds.has(prog.id)}
              onChange={(e) => handleToggle(prog.id, e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">
              {prog.name}
            </span>
            {prog.level && (
              <span className="text-xs text-muted-foreground">({prog.level})</span>
            )}
          </label>
        ))}
      </div>
      {selectedIds.size > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedIds.size} program{selectedIds.size > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
