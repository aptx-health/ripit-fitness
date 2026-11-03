import { Suspense } from 'react'
import LiftSkeleton from '@/components/features/progress/LiftSkeleton'
import LiftView from '@/components/features/progress/LiftView'

/** One lift's history, opened from a Progress lift row. The (app) layout signs the user in. */
export default async function LiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0">
          {/* LiftView reads ?week=, so it renders on the client. */}
          <Suspense fallback={<LiftSkeleton />}>
            <LiftView exerciseDefinitionId={id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
