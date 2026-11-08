/** Shown at once when Proposals is opened, while the list loads: the same frame as page.tsx. */
export default function ProposalsLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted animate-pulse rounded" />
        <div className="h-4 w-80 max-w-full bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-card border border-border animate-pulse rounded" />
        ))}
      </div>
      <span className="sr-only">Loading proposals…</span>
    </div>
  )
}
