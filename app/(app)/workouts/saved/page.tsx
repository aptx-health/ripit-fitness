import { redirect } from 'next/navigation'
import SavedWorkoutsList from '@/components/features/saved-workouts/SavedWorkoutsList'
import { getCurrentUser } from '@/lib/auth/server'

export const metadata = {
  title: 'Saved Workouts',
}

export default async function SavedWorkoutsPage() {
  const { user } = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
          Saved Workouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workouts you have saved to repeat.
        </p>
      </header>

      <SavedWorkoutsList />
    </main>
  )
}
