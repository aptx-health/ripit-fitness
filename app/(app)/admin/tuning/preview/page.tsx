import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TuningPreview } from '@/components/admin/TuningPreview'
import { isAdminRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * Payload-preview page for the TuningConfig admin (issue #937). Admin-only.
 * Renders the exact Suggest payload for a chosen subject (self or a synthetic
 * archetype) under ephemeral, unsaved knob overrides. No LLM call.
 */
export default async function TuningPreviewPage() {
  const { user, error } = await getCurrentUser()
  if (error || !user) redirect('/login')
  if (!isAdminRole(user.role)) redirect('/settings')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payload Preview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Render the exact Suggest payload for a subject under unsaved knob overrides. Previews
            the input to the model — no suggestion is generated.
          </p>
        </div>
        <Link
          href="/admin/tuning"
          className="text-sm font-semibold text-primary hover:underline shrink-0 uppercase tracking-wider"
        >
          ← Config
        </Link>
      </div>
      <TuningPreview />
    </div>
  )
}
