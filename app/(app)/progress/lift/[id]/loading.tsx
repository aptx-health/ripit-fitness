import LiftSkeleton from '@/components/features/progress/LiftSkeleton'

/** Shown at once when a lift row or chip is tapped, while the page loads: the same frame as page.tsx. */
export default function LiftLoading() {
  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0">
          <LiftSkeleton />
        </div>
      </div>
    </div>
  )
}
