import { Loader2 } from 'lucide-react'

/**
 * Fullscreen "Restoring workout…" spinner used as a Suspense fallback
 * and Next.js loading.tsx for both the ad-hoc and programmed workout
 * pages. Keeps the resume-from-cold-load UX consistent and themed.
 */
export function RestoringWorkoutSpinner({
  label = 'Restoring workout…',
}: { label?: string } = {}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-foreground">
        {label}
      </p>
    </div>
  )
}
