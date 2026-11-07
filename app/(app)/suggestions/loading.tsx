/** Shown at once when Suggestions is opened, while the list loads: the same frame as page.tsx. */
export default function SuggestionsLoading() {
  return (
    <div className="bg-background" aria-busy="true">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <div className="h-10 w-56 bg-muted animate-pulse rounded" />
        </div>
        <div className="px-4 sm:px-0 space-y-px">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card border border-border animate-pulse" />
          ))}
        </div>
        <span className="sr-only">Loading suggestions…</span>
      </div>
    </div>
  )
}
