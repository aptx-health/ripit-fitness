export default function CardioLoading() {
  return (
    <div className="min-h-screen bg-background px-6 py-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-10 bg-muted animate-pulse rounded w-72" />
            <div className="h-5 bg-muted animate-pulse rounded w-96" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Current Week Card skeleton */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {/* Week header */}
          <div className="flex justify-between items-center">
            <div className="h-7 bg-muted animate-pulse rounded w-48" />
            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          </div>

          {/* Sessions grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-background border border-border rounded-lg p-4 space-y-3"
              >
                <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                <div className="h-10 bg-muted animate-pulse rounded w-full mt-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Session History skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded w-56" />

          {/* History items */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-4 space-y-3"
              >
                {/* Date and type */}
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted animate-pulse rounded w-32" />
                    <div className="h-6 bg-muted animate-pulse rounded w-48" />
                  </div>
                  <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                </div>

                {/* Session details */}
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-full" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                </div>

                {/* Metrics */}
                <div className="flex gap-4 pt-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
