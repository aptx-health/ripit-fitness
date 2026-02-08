export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Title Skeleton */}
      <div className="text-center mb-8 border-b-2 border-border pb-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-muted rounded w-32 mx-auto" />
      </div>

      {/* Workout Counts Skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border-2 border-border p-4">
            <div className="h-12 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Volume and Running Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card border-2 border-border p-6">
            <div className="h-10 bg-muted rounded mb-2 mx-auto w-32" />
            <div className="h-6 bg-muted rounded mb-2 mx-auto w-16" />
            <div className="h-3 bg-muted rounded w-24 mx-auto" />
          </div>
        ))}
      </div>

      {/* Training Since Skeleton */}
      <div className="text-center border-t-2 border-border pt-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-48 mx-auto" />
      </div>
    </div>
  )
}
