export default function LearnLoading() {
  return (
    <div className="bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Back link and header skeleton */}
        <div className="space-y-3">
          <div className="h-12 bg-muted animate-pulse rounded w-28" />
          <div className="h-10 bg-muted animate-pulse rounded w-40" />
          <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
        </div>

        {/* Search bar skeleton */}
        <div className="h-12 bg-muted animate-pulse rounded w-full" />

        {/* Article cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
