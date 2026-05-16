import { Loader2 } from 'lucide-react'

/**
 * Shown by Next.js while the ad-hoc logger page is server-rendering on
 * resume. Mirrors the spinner in StrengthWeekView (added for #765) so the
 * user gets the same "Restoring workout…" affordance whether they're
 * resuming a programmed or ad-hoc draft.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Restoring workout"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-foreground">
        Restoring workout…
      </p>
    </div>
  )
}
