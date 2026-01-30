import Link from 'next/link'

type Props = {
  currentWeek: number
  totalWeeks: number
  baseUrl: string // '/training' or '/cardio'
  programName: string
  actions?: React.ReactNode
}

export default function WeekNavigator({
  currentWeek,
  totalWeeks,
  baseUrl,
  programName,
  actions
}: Props) {
  const hasPrev = currentWeek > 1
  const hasNext = currentWeek < totalWeeks

  return (
    <div className="flex items-center justify-between gap-2">
      {/* Prev button */}
      <Link
        href={hasPrev ? `${baseUrl}?week=${currentWeek - 1}` : '#'}
        className={`p-2 border shrink-0 ${
          hasPrev
            ? 'border-border text-foreground hover:bg-muted doom-focus-ring'
            : 'border-border/50 text-muted-foreground cursor-not-allowed opacity-50'
        }`}
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? 0 : -1}
        onClick={e => !hasPrev && e.preventDefault()}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
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
        className={`p-2 border shrink-0 ${
          hasNext
            ? 'border-border text-foreground hover:bg-muted doom-focus-ring'
            : 'border-border/50 text-muted-foreground cursor-not-allowed opacity-50'
        }`}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? 0 : -1}
        onClick={e => !hasNext && e.preventDefault()}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>

      {/* Actions slot */}
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
