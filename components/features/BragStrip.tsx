'use client'

type BragStripStats = {
  workoutsThisWeek: number
  workoutsThisMonth: number
  workoutsAllTime: number
  totalVolumeLbs: number
  totalVolumeKg: number
  totalRunningMiles: number
  totalRunningKm: number
  earliestWorkout: string | null
  generatedAt: string
}

type Props = {
  stats: BragStripStats
}

export default function BragStrip({ stats }: Props) {
  // Format training start date
  const trainingStart = stats.earliestWorkout
    ? new Date(stats.earliestWorkout).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently'

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8 border-b-2 border-primary pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary uppercase tracking-wider">
          RIPIT FITNESS
        </h1>
        <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wide">
          YOUR STATS
        </p>
      </div>

      {/* Workout Counts */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border-2 border-border p-4 text-center">
          <div className="text-4xl sm:text-5xl font-bold text-accent mb-2">
            {stats.workoutsThisWeek}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
            This Week
          </div>
        </div>

        <div className="bg-card border-2 border-border p-4 text-center">
          <div className="text-4xl sm:text-5xl font-bold text-accent mb-2">
            {stats.workoutsThisMonth}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
            This Month
          </div>
        </div>

        <div className="bg-card border-2 border-border p-4 text-center">
          <div className="text-4xl sm:text-5xl font-bold text-accent mb-2">
            {stats.workoutsAllTime}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
            All Time
          </div>
        </div>
      </div>

      {/* Volume and Running */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Total Volume */}
        <div className="bg-card border-2 border-accent p-6 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
            {formatNumber(stats.totalVolumeLbs)}
          </div>
          <div className="text-xl sm:text-2xl text-muted-foreground mb-2">
            lbs
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Total Volume
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ({formatNumber(stats.totalVolumeKg)} kg)
          </div>
        </div>

        {/* Running Distance */}
        <div className="bg-card border-2 border-accent p-6 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
            {stats.totalRunningMiles}
          </div>
          <div className="text-xl sm:text-2xl text-muted-foreground mb-2">
            mi
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Running Miles
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ({stats.totalRunningKm} km)
          </div>
        </div>
      </div>

      {/* Training Since */}
      <div className="text-center border-t-2 border-border pt-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">
          Training since{' '}
          <span className="text-foreground font-semibold">{trainingStart}</span>
        </p>
      </div>

      {/* Screenshot Hint */}
      <div className="mt-8 p-4 bg-muted border-2 border-border text-center">
        <p className="text-xs text-muted-foreground">
          Screenshot this page to share your progress on social media
        </p>
      </div>
    </div>
  )
}
