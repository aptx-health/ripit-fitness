import { redirect } from 'next/navigation'
import TrainingHome from '@/components/training/TrainingHome'
import PageTitle from '@/components/ui/PageTitle'
import { getCurrentUser } from '@/lib/auth/server'
import { getTrainingHome } from '@/lib/training/home'
import { trainingResumeRedirectTarget } from '@/lib/training/program-links'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * The Training home. A `?resume=` from an old bookmark or PWA state still goes
 * to the active program's detail page; any other query means nothing.
 */
export default async function TrainingPage({ searchParams }: Props) {
  const [query, { user, error }] = await Promise.all([searchParams, getCurrentUser()])

  if (error || !user) {
    redirect('/login')
  }

  const target = await trainingResumeRedirectTarget(user.id, query)
  if (target) redirect(target)

  const home = await getTrainingHome(user.id)

  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <PageTitle>TRAINING</PageTitle>
        </div>
        <div className="px-4 sm:px-0">
          <TrainingHome home={home} />
        </div>
      </div>
    </div>
  )
}
