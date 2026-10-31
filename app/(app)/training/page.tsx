import { Star } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { trainingRedirectTarget } from '@/lib/training/program-links'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Until TL2 makes this the Training home: with an active program, go to its
 * detail page (query kept, so ?week= and ?resume= still work); without one,
 * show the no-active-program state.
 */
export default async function TrainingPage({ searchParams }: Props) {
  const [query, { user, error }] = await Promise.all([searchParams, getCurrentUser()])

  if (error || !user) {
    redirect('/login')
  }

  const target = await trainingRedirectTarget(user.id, query)
  if (target) redirect(target)

  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
            TRAINING
          </h1>
        </div>
        <div className="px-4 sm:px-0">
          <NoActiveProgram />
        </div>
      </div>
    </div>
  )
}

function NoActiveProgram() {
  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">
        NO ACTIVE PROGRAM
      </h2>
      <p className="text-muted-foreground mb-6">
        Go to Programs and activate one <Star size={14} className="inline text-accent" /> to see it here.
      </p>
      <Link
        href="/programs"
        className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
      >
        VIEW PROGRAMS
      </Link>
    </div>
  )
}
