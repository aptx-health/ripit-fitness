'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface CommunityProgram {
  id: string
  name: string
  description: string
  level: string | null
  curated: boolean
  weekCount: number
  workoutCount: number
  exerciseCount: number
  goals: string[]
  targetDaysPerWeek: number | null
  publishedAt: string | null
}

const LEVEL_TABS = ['all', 'beginner', 'intermediate', 'advanced'] as const
const CURATED_TABS = ['all', 'curated', 'user'] as const

export default function AdminCommunityProgramsPage() {
  const [programs, setPrograms] = useState<CommunityProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLevel, setActiveLevel] = useState<string>('all')
  const [activeCurated, setActiveCurated] = useState<string>('all')
  const [search, setSearch] = useState('')

  const searchKey = `${activeLevel}-${activeCurated}-${search}`
  const [prevSearchKey, setPrevSearchKey] = useState(searchKey)
  if (prevSearchKey !== searchKey) {
    setPrevSearchKey(searchKey)
    setLoading(true)
  }

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (activeLevel !== 'all') params.set('level', activeLevel)
    if (activeCurated === 'curated') params.set('curated', 'true')
    if (activeCurated === 'user') params.set('curated', 'false')
    if (search.trim()) params.set('search', search.trim())

    fetch(`/api/admin/community-programs?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setPrograms(json.data || [])
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [activeLevel, activeCurated, search])

  const levelColor = (level: string | null) => {
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
        <h1 className="text-2xl font-bold uppercase tracking-wider">Community Programs</h1>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search programs..."
          className="w-full max-w-md px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-1">
          {LEVEL_TABS.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveLevel(tab)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
                activeLevel === tab
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {CURATED_TABS.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveCurated(tab)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
                activeCurated === tab
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Program list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : programs.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No community programs found.
        </div>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => (
            <Link
              key={program.id}
              href={program.curated ? `/admin/community-programs/${program.id}/edit` : '#'}
              className={`block p-4 bg-card border-2 border-border transition-colors ${
                program.curated ? 'hover:border-primary' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{program.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {program.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {program.level && (
                      <span className={`text-xs px-2 py-0.5 border ${levelColor(program.level)} font-semibold uppercase`}>
                        {program.level}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${
                      program.curated
                        ? 'text-blue-400 border-blue-700'
                        : 'text-zinc-400 border-zinc-600'
                    }`}>
                      {program.curated ? 'curated' : 'user'}
                    </span>
                    {program.targetDaysPerWeek && (
                      <span className="text-xs text-muted-foreground">
                        {program.targetDaysPerWeek} days/week
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{program.weekCount} weeks</div>
                  <div>{program.workoutCount} workouts</div>
                  <div>{program.exerciseCount} exercises</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
