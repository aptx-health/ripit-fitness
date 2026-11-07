/** Shown at once when a suggestion is opened, while it loads: the same frame as page.tsx. */
export default function SuggestionLoading() {
  return (
    <div className="bg-background" aria-busy="true">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 pt-4 mb-4">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="px-4 sm:px-0 space-y-5">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-7 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-20 bg-muted animate-pulse" />
          <div className="h-48 bg-card border border-border animate-pulse" />
        </div>
        <span className="sr-only">Loading suggestion…</span>
      </div>
    </div>
  )
}
