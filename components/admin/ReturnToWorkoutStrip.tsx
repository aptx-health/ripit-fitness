'use client'

import { Dumbbell } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'

type ActiveDraft = {
  completionId: string
  workoutId: string | null
  workoutName: string
  isAdHoc: boolean
  weekNumber: number | null
  dayNumber: number | null
}

/**
 * Shown on every Workbench screen when a workout is mid-flight, so the
 * gym-floor detour into admin always has a visible way back.
 */
export default function ReturnToWorkoutStrip() {
  const [draft, setDraft] = useState<ActiveDraft | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/workouts/active-draft')
      .then((res) => (res.ok ? res.json() : { draft: null }))
      .then((data) => {
        if (!cancelled) setDraft(data.draft ?? null)
      })
      .catch((err) => clientLogger.error('Failed to load active draft for return strip', err))
    return () => {
      cancelled = true
    }
  }, [])

  if (!draft) return null

  const label = draft.isAdHoc
    ? 'FREESTYLE WORKOUT'
    : draft.weekNumber && draft.dayNumber
      ? `WORKOUT IN PROGRESS · W${draft.weekNumber} D${draft.dayNumber}`
      : 'WORKOUT IN PROGRESS'

  const href = draft.isAdHoc
    ? `/training/adhoc/${draft.completionId}`
    : draft.workoutId
      ? `/training?resume=${draft.workoutId}`
      : '/training'

  return (
    <Link
      href={href}
      className="flex items-center gap-2 h-[38px] px-4 shrink-0 bg-accent-muted border-b-2 border-accent text-foreground"
    >
      <Dumbbell size={16} className="shrink-0 text-accent" />
      <span className="flex-1 min-w-0 truncate text-xs font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent">
        Return &rsaquo;
      </span>
    </Link>
  )
}
