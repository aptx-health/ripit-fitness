import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import FloatingDraftButton from '@/components/FloatingDraftButton'
import FeedbackButton from '@/components/features/FeedbackButton'
import { SignupCompletedTracker } from '@/components/features/SignupCompletedTracker'
import Header from '@/components/Header'
import { getCurrentUser } from '@/lib/auth/server'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'
import { DraftWorkoutProvider } from '@/lib/contexts/DraftWorkoutContext'
import { prisma } from '@/lib/db'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  // Waiver gate: redirect to waiver screen if user has not accepted
  // the current version. Authoritative DB check (middleware is edge-only).
  const latestAcceptance = await prisma.waiverAcceptance.findFirst({
    where: { userId: user.id, waiverVersion: CURRENT_WAIVER_VERSION },
    select: { id: true },
  })

  if (!latestAcceptance) {
    redirect('/waiver')
  }

  return (
    <DraftWorkoutProvider>
      <div className="min-h-screen bg-background">
        <SignupCompletedTracker />
        <Header userEmail={user.email || ''} />
        <FloatingDraftButton />
        <div className="pb-20 md:pb-0">
          <div
            className="md:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          />
          {children}
        </div>
        <BottomNav />
        <FeedbackButton />
      </div>
    </DraftWorkoutProvider>
  )
}
