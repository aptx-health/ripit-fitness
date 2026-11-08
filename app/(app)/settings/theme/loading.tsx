/** Shown at once when the Theme row is tapped, while the page loads: the same frame as page.tsx. */
export default function ThemeLoading() {
  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8" aria-busy="true">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-3">
          <div className="h-12 w-24 animate-pulse bg-muted" />
          <div className="h-8 w-32 animate-pulse bg-muted" />
          <div className="h-4 w-full animate-pulse bg-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse border border-border bg-card" />
          ))}
        </div>
        <span className="sr-only">Loading Theme…</span>
      </div>
    </main>
  )
}
