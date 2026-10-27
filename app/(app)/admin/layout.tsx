import { redirect } from 'next/navigation'
import AdminContentPadding from '@/components/admin/AdminContentPadding'
import AdminMobileHeader from '@/components/admin/AdminMobileHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import ReturnToWorkoutStrip from '@/components/admin/ReturnToWorkoutStrip'
import { isEditorRole } from '@/lib/admin/auth'
import { getWorkbenchCounts } from '@/lib/admin/workbench-counts'
import { getCurrentUser } from '@/lib/auth/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  if (!isEditorRole(user.role)) {
    redirect('/settings')
  }

  const counts = await getWorkbenchCounts()

  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar counts={counts} />
      <div className="min-w-0 flex-1 flex flex-col min-h-screen">
        <AdminMobileHeader />
        <ReturnToWorkoutStrip />
        <main className="flex-1 min-w-0">
          <AdminContentPadding>{children}</AdminContentPadding>
        </main>
      </div>
    </div>
  )
}
