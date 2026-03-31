'use client'

import { ChevronRight, Pencil, Star } from 'lucide-react'
import Link from 'next/link'

type Props = {
  programId: string
  programName: string
  currentWeek: number | null
  totalWeeks: number | null
}

export default function ActiveProgramStrip({ programId, programName, currentWeek, totalWeeks }: Props) {
  return (
    <div className="border border-border border-l-4 border-l-success bg-card doom-noise p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <Star size={18} className="text-success shrink-0" fill="currentColor" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground doom-heading uppercase truncate">
            {programName}
          </h3>
          {currentWeek && totalWeeks && (
            <p className="text-sm text-muted-foreground">
              Week {currentWeek} of {totalWeeks}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/programs/${programId}/edit`}
            className="flex items-center gap-1 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
            aria-label="Edit program"
          >
            <Pencil size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">EDIT</span>
          </Link>
          <Link
            href="/training"
            className="flex items-center gap-1 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
            aria-label="Go to training"
          >
            <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">TRAIN</span>
            <ChevronRight size={18} className="shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}
