import { redirect } from 'next/navigation'
import Coaching from '@/components/features/coaching/Coaching'
import { getCurrentUser } from '@/lib/auth/server'
import { listCoaching } from '@/lib/coaching/links'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'Coaching',
}

/** Settings → Coaching: invite trainees, see your trainees and your coach. */
export default async function CoachingPage() {
  const { user } = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { invites, trainees, coaches } = await listCoaching(prisma, user.id)
  const person = (p: (typeof trainees)[number]) => ({ linkId: p.linkId, name: p.name, linkedAt: p.linkedAt.toISOString() })

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <Coaching
          invites={invites.map((i) => ({ id: i.id, expiresAt: i.expiresAt.toISOString() }))}
          trainees={trainees.map(person)}
          coaches={coaches.map(person)}
        />
      </div>
    </main>
  )
}
