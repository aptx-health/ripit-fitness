import { useUserSettings } from '@/hooks/useUserSettings'

/**
 * Returns whether the current user has access to intensity features (RIR/RPE).
 * Access requires intensityEnabled in settings. Admins can toggle this on/off
 * in settings — admin role grants the ability to toggle, not automatic access.
 */
export function useIntensityAccess() {
  const { settings, isLoading } = useUserSettings()

  const hasAccess = settings?.intensityEnabled ?? false

  return { hasAccess, isLoading }
}
