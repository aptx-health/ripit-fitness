export default function TrainingLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-10 bg-muted animate-pulse rounded w-80" />
            <div className="h-5 bg-muted animate-pulse rounded w-96" />
          </div>
          <div className="h-12 w-36 bg-muted animate-pulse rounded" />
        </div>

        {/* Current Week Card skeleton */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {/* Week header */}
          <div className="flex justify-between items-center">
            <div className="h-7 bg-muted animate-pulse rounded w-48" />
            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          </div>

          {/* Workouts grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-background border border-border rounded-lg p-4 space-y-3"
              >
                <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-10 bg-muted animate-pulse rounded w-full mt-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Workout History skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded w-56" />

          {/* History items */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-4 space-y-3"
              >
                {/* Date and status */}
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted animate-pulse rounded w-32" />
                    <div className="h-6 bg-muted animate-pulse rounded w-48" />
                  </div>
                  <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                </div>

                {/* Exercise list */}
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-full" />
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                  <div className="h-4 bg-muted animate-pulse rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
