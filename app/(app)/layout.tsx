import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import FeedbackButton from '@/components/features/FeedbackButton'
import { getCurrentUser } from '@/lib/auth/server'

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
    <div className="min-h-screen">
      <Header userEmail={user.email || ''} />
      {children}
      <FeedbackButton />
    </div>
  )
}
