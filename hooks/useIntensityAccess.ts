import { useUserSettings } from '@/hooks/useUserSettings'
import { useSession } from '@/lib/auth-client'

/**
 * Returns whether the current user has access to intensity features (RIR/RPE).
 * Access is granted if:
 * - intensityEnabled is true in their settings, OR
 * - the user has an admin role (automatic premium access)
 */
export function useIntensityAccess() {
  const { settings, isLoading: settingsLoading } = useUserSettings()
  const { data: session, isPending: sessionLoading } = useSession()

  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
  const isAdmin = userRole === 'admin'

  const hasAccess = isAdmin || (settings?.intensityEnabled ?? false)
  const isLoading = settingsLoading || sessionLoading

  return { hasAccess, isLoading }
}
