import { useUserSettings } from '@/hooks/useUserSettings'

/**
 * Returns whether the current user has intensity features (RIR/RPE) enabled.
 * All users can toggle this on/off in Settings. Beginners start with it off,
 * experienced users get it auto-enabled during onboarding.
 */
export function useIntensityAccess() {
  const { settings, isLoading } = useUserSettings()

  const hasAccess = settings?.intensityEnabled ?? false

  return { hasAccess, isLoading }
}
