'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { RestoringWorkoutSpinner } from '@/components/ui/RestoringWorkoutSpinner'

/**
 * Shown by Next.js while the ad-hoc logger page is server-rendering on
 * route transitions. Reads `?new=1` (set by QuickActionSheet when starting
 * a freestyle workout) to decide between "Loading…" and "Restoring…" so
 * the user doesn't see "Restoring workout…" for a workout they're starting
 * from scratch.
 */
export default function Loading() {
  return (
    <Suspense fallback={<RestoringWorkoutSpinner label="Loading workout…" />}>
      <LabelledSpinner />
    </Suspense>
  )
}

function LabelledSpinner() {
  const params = useSearchParams()
  const isNew = params?.get('new') === '1'
  return (
    <RestoringWorkoutSpinner
      label={isNew ? 'Loading workout…' : 'Restoring workout…'}
    />
  )
}
