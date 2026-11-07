/** Shown at once when a proposal is opened, while it loads: the same frame as page.tsx. */
export default function ProposalLoading() {
  return (
    <div className="space-y-6 max-w-3xl" aria-busy="true">
      <div className="space-y-2">
        <div className="h-5 w-48 bg-muted animate-pulse rounded" />
        <div className="h-7 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-56 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-48 bg-card border border-border animate-pulse rounded" />
      <span className="sr-only">Loading proposal…</span>
    </div>
  )
}
