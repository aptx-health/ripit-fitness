import { RestoringWorkoutSpinner } from '@/components/ui/RestoringWorkoutSpinner'

/**
 * Shown by Next.js while the ad-hoc logger page is server-rendering on
 * route transitions. The page itself also uses <Suspense> with the same
 * fallback to cover cold loads / page reloads where loading.tsx isn't
 * triggered.
 */
export default function Loading() {
  return <RestoringWorkoutSpinner />
}
