import { redirect } from 'next/navigation'
import AppScrollContainer from '@/components/AppScrollContainer'
import BottomNav from '@/components/BottomNav'
import FeedbackButton from '@/components/features/FeedbackButton'
import { PwaInstallButton } from '@/components/features/PwaInstallButton'
import { SessionContextTracker } from '@/components/features/SessionContextTracker'
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
      {/* Mobile: a fixed-height shell whose content scrolls inside
          AppScrollContainer, so the document never scrolls under the iOS
          status bar. Desktop: the window scrolls as before. */}
      <div className="flex h-(--app-h) flex-col overflow-hidden bg-background md:block md:h-auto md:min-h-screen md:overflow-visible">
        <SignupCompletedTracker />
        <SessionContextTracker />
        <Header userEmail={user.email || ''} />
        <div
          className="shrink-0 bg-background md:hidden"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        />
        <AppScrollContainer>{children}</AppScrollContainer>
        <BottomNav />
        <PwaInstallButton />
        <FeedbackButton />
      </div>
    </DraftWorkoutProvider>
  )
}
