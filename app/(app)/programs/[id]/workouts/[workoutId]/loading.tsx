export default function WorkoutDetailLoading() {
  return (
    <div className="min-h-screen bg-background pb-24 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="h-4 bg-muted rounded w-24 mb-2"></div>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-3 bg-muted rounded w-12 mb-2"></div>
              <div className="h-7 bg-muted rounded w-48"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Exercises Skeleton */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              {/* Exercise Header Skeleton */}
              <div className="bg-muted px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20"></div>
                  <div className="h-5 bg-muted-foreground/20 rounded w-32"></div>
                </div>
              </div>

              {/* Sets Table Skeleton */}
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Button Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="h-14 bg-primary/20 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}
