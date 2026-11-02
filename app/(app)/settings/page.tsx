import { redirect } from 'next/navigation'
import AccountBlock from '@/components/settings/AccountBlock'
import AdminBlock from '@/components/settings/AdminBlock'
import HelpBlock from '@/components/settings/HelpBlock'
import LookBlock from '@/components/settings/LookBlock'
import TrainingTargetsBlock from '@/components/settings/TrainingTargetsBlock'
import WorkoutsBlock from '@/components/settings/WorkoutsBlock'
import PageTitle from '@/components/ui/PageTitle'
import { isEditorRole } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * Settings, rendered on the server: the user is read here with getCurrentUser
 * (the old client page asked the browser auth client for the session while
 * rendering on the server, which was the 500), and each block is a small
 * client component fed what it needs.
 */
export default async function SettingsPage() {
  const { user, error } = await getCurrentUser()
  if (error || !user) redirect('/login')

  const role = (user as { role?: string | null }).role ?? 'user'

  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <PageTitle>Settings</PageTitle>
        </div>
        <div className="space-y-6 px-4 sm:px-0">
          <LookBlock />
          <WorkoutsBlock />
          <TrainingTargetsBlock />
          <AccountBlock email={user.email ?? ''} />
          <HelpBlock />
          {isEditorRole(role) && <AdminBlock />}
        </div>
      </div>
    </div>
  )
}
