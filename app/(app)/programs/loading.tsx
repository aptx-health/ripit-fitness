export default function ProgramsLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-10 bg-muted animate-pulse rounded w-64" />
            <div className="h-5 bg-muted animate-pulse rounded w-96" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-muted animate-pulse rounded" />
            <div className="h-12 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b border-border">
          <div className="h-10 w-32 bg-muted animate-pulse rounded-t" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded-t" />
        </div>

        {/* Programs grid skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-6 space-y-4"
            >
              {/* Program title */}
              <div className="h-7 bg-muted animate-pulse rounded w-3/4" />

              {/* Stats */}
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <div className="h-10 bg-muted animate-pulse rounded flex-1" />
                <div className="h-10 w-10 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Archived section skeleton */}
        <div className="pt-8 space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded w-48" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-4 flex justify-between items-center"
              >
                <div className="h-5 bg-muted animate-pulse rounded w-48" />
                <div className="h-9 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
