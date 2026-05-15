import { redirect } from 'next/navigation'
import { isEditorRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'

export default async function ThemeValidatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  if (!isEditorRole(user.role)) {
    redirect('/')
  }

  return <>{children}</>
}
