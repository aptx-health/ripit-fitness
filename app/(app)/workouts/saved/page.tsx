import { redirect } from 'next/navigation'
import { legacySavedWorkoutsRedirectTarget } from '@/lib/library/links'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Old saved-workouts page: now Library → Workouts. */
export default async function SavedWorkoutsPage({ searchParams }: Props) {
  redirect(legacySavedWorkoutsRedirectTarget(await searchParams))
}
