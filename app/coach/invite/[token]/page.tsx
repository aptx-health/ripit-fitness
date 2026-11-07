import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'
import InviteAccept from '@/components/features/coaching/InviteAccept'
import { INVITE_BUTTON, INVITE_BUTTON_PRIMARY } from '@/components/features/coaching/invite-styles'
import { withReturnPath } from '@/lib/auth/return-path'
import { getCurrentUser } from '@/lib/auth/server'
import { hasCurrentWaiver } from '@/lib/auth/waiver'
import { getInvite, invitePath } from '@/lib/coaching/invites'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'Coaching invite',
}

export const revalidate = 0

/**
 * A coach's invite link. Reachable signed out (lib/auth/middleware.ts): then it
 * offers Sign up and Sign in, which bring the user back here (?next=). Signed in,
 * a valid invite offers Accept / No thanks; anything else says why not. A
 * signed-in user without the current waiver agrees to it first, then comes back.
 */
export default async function CoachInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { user } = await getCurrentUser()
  const back = invitePath(token)
  if (user && !(await hasCurrentWaiver(prisma, user.id))) redirect(withReturnPath('/waiver', back))
  const { status, coachName } = await getInvite(prisma, token, user?.id ?? null)
  const coach = coachName ?? ''

  let body: React.ReactNode
  if (status === 'invalid') {
    body = (
      <>
        <h1 className="text-[22px] font-semibold text-foreground">This invite is no longer valid</h1>
        <p className="text-[15px] text-muted-foreground">
          It may have expired, been used or been revoked. Ask your coach for a new link.
        </p>
        <Link href="/" className={INVITE_BUTTON}>
          Go to Ripit
        </Link>
      </>
    )
  } else if (status === 'self') {
    body = (
      <>
        <h1 className="text-[22px] font-semibold text-foreground">You can&apos;t coach yourself</h1>
        <p className="text-[15px] text-muted-foreground">Send this link to the person you coach.</p>
        <Link href="/settings/coaching" className={INVITE_BUTTON}>
          Back to Coaching
        </Link>
      </>
    )
  } else if (status === 'already_linked') {
    body = (
      <>
        <h1 className="text-[22px] font-semibold text-foreground">You&apos;re already linked with {coach}</h1>
        <p className="text-[15px] text-muted-foreground">There&apos;s nothing to accept. This invite stays unused.</p>
        <Link href="/settings/coaching" className={INVITE_BUTTON}>
          See Coaching
        </Link>
      </>
    )
  } else {
    body = (
      <>
        <h1 className="text-[22px] font-semibold text-foreground">{coach} wants to coach you</h1>
        <p className="text-[15px] text-muted-foreground">
          {coach} can send you programs and workouts to accept or decline. {coach} will see only what they send you
          and whether you accept it. You can end the link any time in Settings → Coaching.
        </p>
        {user ? (
          <InviteAccept token={token} />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={withReturnPath('/signup', back)} className={INVITE_BUTTON_PRIMARY}>
              Sign up
            </Link>
            <Link href={withReturnPath('/login', back)} className={INVITE_BUTTON}>
              Sign in
            </Link>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader />
        {body}
      </div>
    </div>
  )
}
