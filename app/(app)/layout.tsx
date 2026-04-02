import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import FloatingDraftButton from '@/components/FloatingDraftButton'
import FeedbackButton from '@/components/features/FeedbackButton'
import Header from '@/components/Header'
import { TourProvider } from '@/components/tour'
import { getCurrentUser } from '@/lib/auth/server'
import { DraftWorkoutProvider } from '@/lib/contexts/DraftWorkoutContext'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <DraftWorkoutProvider>
      <TourProvider>
      <div className="min-h-screen">
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
    </TourProvider>
    </DraftWorkoutProvider>
  )
}
