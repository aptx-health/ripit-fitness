import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Props = {
  currentWeek: number
  totalWeeks: number
  baseUrl: string // '/training' or '/cardio'
  programName: string
  completionIndicator?: React.ReactNode
}

export default function WeekNavigator({
  currentWeek,
  totalWeeks,
  baseUrl,
  programName,
  completionIndicator
}: Props) {
  const hasPrev = currentWeek > 1
  const hasNext = currentWeek < totalWeeks

  return (
    <div data-tour="week-nav">
      {/* Week number row with arrows */}
      <div className="flex items-center justify-center gap-1">
        {/* Prev button */}
        <Link
          href={hasPrev ? `${baseUrl}?week=${currentWeek - 1}` : '#'}
          className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-colors doom-focus-ring ${
            hasPrev
              ? 'text-foreground hover:bg-muted/50 active:bg-muted'
              : 'text-muted-foreground/20 pointer-events-none'
          }`}
          aria-disabled={!hasPrev}
          aria-label="Previous week"
          tabIndex={hasPrev ? 0 : -1}
          onClick={e => !hasPrev && e.preventDefault()}
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </Link>

        {/* Center content */}
        <div className="text-center min-w-0 px-2">
          <h2 className="text-lg sm:text-2xl font-bold text-foreground doom-heading">
            WEEK {currentWeek} OF {totalWeeks}
          </h2>
          <span className="inline-block px-3 py-0.5 bg-primary text-primary-foreground text-xs sm:text-sm font-bold uppercase tracking-wider mt-1">
            {programName}
          </span>
        </div>

        {/* Next button */}
        <Link
          href={hasNext ? `${baseUrl}?week=${currentWeek + 1}` : '#'}
          className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-colors doom-focus-ring ${
            hasNext
              ? 'text-foreground hover:bg-muted/50 active:bg-muted'
              : 'text-muted-foreground/20 pointer-events-none'
          }`}
          aria-disabled={!hasNext}
          aria-label="Next week"
          tabIndex={hasNext ? 0 : -1}
          onClick={e => !hasNext && e.preventDefault()}
        >
          <ChevronRight size={22} strokeWidth={1.5} />
        </Link>

        {/* Completion indicator badge */}
        {completionIndicator && (
          <div className="shrink-0 ml-1">
            {completionIndicator}
          </div>
        )}
      </div>

      {/* Horizontal rule separator */}
      <div className="border-t border-primary/30 mt-3" />
    </div>
  )
}
