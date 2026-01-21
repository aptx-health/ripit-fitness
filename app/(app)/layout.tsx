import { getCurrentUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'

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
    </div>
  )
}
