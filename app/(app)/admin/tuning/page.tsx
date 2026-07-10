import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TuningConfigForm } from '@/components/admin/TuningConfigForm'
import { isAdminRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * Admin page for the learning-pipeline TuningConfig (issue #937).
 *
 * Admin-only (the shared admin layout allows editors, so re-guard here). The
 * form itself is a client component that reads/writes /api/admin/tuning-config.
 */
export default async function TuningConfigPage() {
  const { user, error } = await getCurrentUser()
  if (error || !user) redirect('/login')
  if (!isAdminRole(user.role)) redirect('/settings')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Learning Tuning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin-editable thresholds for the Suggest learning pipeline. Changes take effect on
            the next recompute and suggestion — no redeploy needed.
          </p>
        </div>
        <Link
          href="/admin/tuning/preview"
          className="text-sm font-semibold text-primary hover:underline shrink-0 uppercase tracking-wider"
        >
          Payload preview →
        </Link>
      </div>
      <TuningConfigForm />
    </div>
  )
}
