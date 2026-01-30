import Link from 'next/link'

type Props = {
  currentWeek: number
  totalWeeks: number
  baseUrl: string // '/training' or '/cardio'
  programName: string
}

export default function WeekNavigator({
  currentWeek,
  totalWeeks,
  baseUrl,
  programName
}: Props) {
  const hasPrev = currentWeek > 1
  const hasNext = currentWeek < totalWeeks

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={hasPrev ? `${baseUrl}?week=${currentWeek - 1}` : '#'}
          className={`p-2 border ${
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

        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground doom-heading">
            WEEK {currentWeek} OF {totalWeeks}
          </h2>
          <p className="text-sm text-muted-foreground">{programName}</p>
        </div>

        <Link
          href={hasNext ? `${baseUrl}?week=${currentWeek + 1}` : '#'}
          className={`p-2 border ${
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
      </div>
    </div>
  )
}
