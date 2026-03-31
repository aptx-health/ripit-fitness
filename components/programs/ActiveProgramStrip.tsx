'use client'

import { ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'

type Props = {
  programName: string
  currentWeek: number | null
  totalWeeks: number | null
}

export default function ActiveProgramStrip({ programName, currentWeek, totalWeeks }: Props) {
  return (
    <Link
      href="/training"
      className="block border border-border border-l-4 border-l-success bg-card doom-noise p-3 sm:p-4 transition-all hover:bg-muted/50 active:bg-muted/70 doom-focus-ring"
    >
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
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold hidden sm:block">
          GO TO TRAINING
        </span>
        <ChevronRight size={18} className="text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
