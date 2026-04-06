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
    <div data-tour="week-nav" className="flex items-center justify-between gap-2">
      {/* Prev button */}
      <Link
        href={hasPrev ? `${baseUrl}?week=${currentWeek - 1}` : '#'}
        className={`shrink-0 flex items-center justify-center h-11 px-3 rounded-full transition-colors doom-focus-ring ${
          hasPrev
            ? 'text-foreground hover:bg-muted/50 active:bg-muted'
            : 'text-muted-foreground/20 pointer-events-none'
        }`}
        aria-disabled={!hasPrev}
        aria-label="Previous week"
        tabIndex={hasPrev ? 0 : -1}
        onClick={e => !hasPrev && e.preventDefault()}
      >
        <ChevronLeft size={24} strokeWidth={1.5} />
      </Link>

      {/* Center content */}
      <div className="flex-1 text-center min-w-0">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground doom-heading">
          WEEK {currentWeek} OF {totalWeeks}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">
          {programName}
        </p>
      </div>

      {/* Next button */}
      <Link
        href={hasNext ? `${baseUrl}?week=${currentWeek + 1}` : '#'}
        className={`shrink-0 flex items-center justify-center h-11 px-3 rounded-full transition-colors doom-focus-ring ${
          hasNext
            ? 'text-foreground hover:bg-muted/50 active:bg-muted'
            : 'text-muted-foreground/20 pointer-events-none'
        }`}
        aria-disabled={!hasNext}
        aria-label="Next week"
        tabIndex={hasNext ? 0 : -1}
        onClick={e => !hasNext && e.preventDefault()}
      >
        <ChevronRight size={24} strokeWidth={1.5} />
      </Link>

      {/* Completion indicator badge */}
      {completionIndicator && (
        <div className="shrink-0">
          {completionIndicator}
        </div>
      )}
    </div>
  )
}
