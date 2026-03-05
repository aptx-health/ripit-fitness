type WeekNavigationProps = {
  currentWeekIndex: number
  totalWeeks: number
  isLoadingWeek: boolean
  navigateToWeek: (index: number) => void
}

export default function WeekNavigation({
  currentWeekIndex,
  totalWeeks,
  isLoadingWeek,
  navigateToWeek,
}: WeekNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <button
        onClick={() => navigateToWeek(currentWeekIndex - 1)}
        disabled={currentWeekIndex === 0 || isLoadingWeek}
        className={`p-2 border shrink-0 ${
          currentWeekIndex > 0 && !isLoadingWeek
            ? 'border-border text-foreground hover:bg-muted doom-focus-ring'
            : 'border-border/50 text-muted-foreground cursor-not-allowed opacity-50'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex-1 text-center">
        <h3 className="text-lg font-bold text-foreground doom-heading">
          WEEK {currentWeekIndex + 1} OF {totalWeeks}
          {isLoadingWeek && <span className="ml-2 text-muted-foreground text-sm">Loading...</span>}
        </h3>
      </div>

      <button
        onClick={() => navigateToWeek(currentWeekIndex + 1)}
        disabled={currentWeekIndex >= totalWeeks - 1 || isLoadingWeek}
        className={`p-2 border shrink-0 ${
          currentWeekIndex < totalWeeks - 1 && !isLoadingWeek
            ? 'border-border text-foreground hover:bg-muted doom-focus-ring'
            : 'border-border/50 text-muted-foreground cursor-not-allowed opacity-50'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
