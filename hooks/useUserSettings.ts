import { useState, useEffect, useCallback } from 'react'

export type UserSettings = {
  displayName: string | null
  defaultWeightUnit: 'lbs' | 'kg'
  defaultIntensityRating: 'rpe' | 'rir'
}

type UseUserSettingsReturn = {
  settings: UserSettings | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateSettings: (settings: UserSettings) => Promise<void>
}

export function useUserSettings(): UseUserSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings')
      }

      setSettings(data.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      console.error('Error fetching user settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      setError(null)

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }

      setSettings(data.settings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings'
      setError(errorMessage)
      console.error('Error updating user settings:', err)
      throw new Error(errorMessage)
    }
  }, [])

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    updateSettings,
  }
}
