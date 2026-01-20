export default function CardioProgramLoading() {
  return (
    <div className="min-h-screen bg-background p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 bg-muted rounded w-64"></div>
              <div className="h-6 bg-primary/20 rounded w-16"></div>
            </div>
            <div className="h-4 bg-muted rounded w-96 mb-2"></div>
            <div className="flex gap-4 mt-2">
              <div className="h-3 bg-muted rounded w-16"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-muted rounded"></div>
            <div className="h-10 w-20 bg-muted rounded"></div>
          </div>
        </div>

        {/* Weeks Skeleton */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border doom-noise doom-card">
              {/* Week Header Skeleton */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 bg-muted rounded"></div>
                  <div>
                    <div className="h-7 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-40"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full"></div>
                  <div className="h-3 bg-muted rounded w-8"></div>
                </div>
              </div>

              {/* Week Content Skeleton */}
              <div className="border-t border-border p-4 space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="border border-border bg-muted p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-muted-foreground/20 rounded w-48"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="h-3 bg-muted-foreground/20 rounded w-16 mb-1"></div>
                            <div className="h-4 bg-muted-foreground/20 rounded w-12"></div>
                          </div>
                          <div>
                            <div className="h-3 bg-muted-foreground/20 rounded w-16 mb-1"></div>
                            <div className="h-4 bg-muted-foreground/20 rounded w-20"></div>
                          </div>
                        </div>
                      </div>
                      <div className="h-10 w-28 bg-primary/20 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
