import { redirect } from 'next/navigation'
import Tier1Tiles from '@/components/admin/workbench/Tier1Tiles'
import Tier2Groups from '@/components/admin/workbench/Tier2Groups'
import Tier3More from '@/components/admin/workbench/Tier3More'
import WorkbenchSearch from '@/components/admin/workbench/WorkbenchSearch'
import { isEditorRole } from '@/lib/admin/auth'
import { getWorkbenchCounts } from '@/lib/admin/workbench-counts'
import { getCurrentUser } from '@/lib/auth/server'

// Counts should stay fresh — this is a launcher, not a cached dashboard.
export const revalidate = 0

export default async function AdminHomePage() {
  const { user } = await getCurrentUser()
  if (!user || !isEditorRole(user.role)) {
    redirect('/settings')
  }

  const counts = await getWorkbenchCounts()

  return (
    <>
      {/* Phone: the launcher. Desktop already gets full breadth from the sidebar. */}
      <div className="lg:hidden p-4 space-y-5">
        <WorkbenchSearch />
        <Tier1Tiles counts={counts} />
        <Tier2Groups counts={counts} />
        <Tier3More />
      </div>
      <div className="hidden lg:flex h-full min-h-[60vh] items-center justify-center px-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wider text-center">
          Pick a section from the sidebar to get started.
        </p>
      </div>
    </>
  )
}
