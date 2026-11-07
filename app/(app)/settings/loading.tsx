/** Shown at once when Settings is opened, while the page loads: the same frame as page.tsx. */
export default function SettingsLoading() {
  return (
    <div className="bg-background" aria-busy="true">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-6 px-4 sm:px-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-28 bg-card border border-border animate-pulse rounded" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading Settings…</span>
      </div>
    </div>
  )
}
