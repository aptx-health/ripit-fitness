import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
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
      <div className="pb-20 md:pb-0">
        <div
          className="md:hidden"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        />
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
