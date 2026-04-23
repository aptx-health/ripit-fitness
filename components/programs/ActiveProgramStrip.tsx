'use client'

import { ChevronDown, ChevronRight, Dumbbell, Pencil, Star } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type Props = {
  programId: string
  programName: string
  description: string | null
  currentWeek: number | null
  totalWeeks: number | null
  weekCount: number
  targetDaysPerWeek: number | null
}

export default function ActiveProgramStrip({
  programId,
  programName,
  description,
  currentWeek,
  totalWeeks,
  weekCount,
  targetDaysPerWeek,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-primary/40 border-l-4 border-l-primary bg-primary/5 doom-noise">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
      >
        <Star size={18} className="text-success shrink-0" fill="currentColor" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground doom-heading uppercase truncate">
              {programName}
            </h3>
            <span className="text-xs font-bold text-primary uppercase tracking-wider shrink-0">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {currentWeek && totalWeeks && (
              <span>Week {currentWeek} of {totalWeeks}</span>
            )}
            {currentWeek && totalWeeks && targetDaysPerWeek && (
              <span aria-hidden="true">&middot;</span>
            )}
            {!currentWeek && weekCount > 0 && (
              <span>{weekCount}wk</span>
            )}
            {!currentWeek && weekCount > 0 && targetDaysPerWeek && (
              <span aria-hidden="true">&middot;</span>
            )}
            {targetDaysPerWeek && (
              <span>{targetDaysPerWeek}x/wk</span>
            )}
          </div>
        </div>
        {isExpanded
          ? <ChevronDown size={18} className="text-muted-foreground shrink-0" />
          : <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        }
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 bg-muted/20">
          {description && (
            <p className="text-sm text-muted-foreground py-3 leading-relaxed">
              {description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/training"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider doom-button-3d doom-focus-ring"
            >
              <Dumbbell size={14} />
              TRAIN
            </Link>
            <Link
              href={`/programs/${programId}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring"
            >
              <Pencil size={14} />
              EDIT
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
