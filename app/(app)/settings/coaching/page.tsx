import { redirect } from 'next/navigation'
import Coaching from '@/components/features/coaching/Coaching'
import { getCurrentUser } from '@/lib/auth/server'
import { listCoaching } from '@/lib/coaching/links'
import { listSent } from '@/lib/coaching/send'
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
  // What the coach sent to each trainee (only names, kinds, dates and statuses).
  const sent = await Promise.all(trainees.map((t) => listSent(prisma, user.id, t.linkId)))
  const person = (p: (typeof trainees)[number]) => ({ linkId: p.linkId, name: p.name, linkedAt: p.linkedAt.toISOString() })

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <Coaching
          invites={invites.map((i) => ({ id: i.id, expiresAt: i.expiresAt.toISOString() }))}
          trainees={trainees.map((t, i) => ({
            ...person(t),
            sent: sent[i].map((r) => ({ name: r.name, kind: r.kind, sentAt: r.sentAt.toISOString(), status: r.status })),
          }))}
          coaches={coaches.map(person)}
        />
      </div>
    </main>
  )
}
