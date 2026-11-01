'use client'

import { Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useUserSettings } from '@/hooks/useUserSettings'
import { SettingsBlock } from './SettingsBlock'

const LABEL = 'block text-sm font-bold uppercase tracking-wider text-foreground'

/**
 * Workouts: workout mode, intensity tracking and its rating type, saved as
 * before (debounced PUT through useUserSettings). There is no weight unit
 * control (hidden on purpose, fba784df): the loaded unit is sent back as is.
 */
export default function WorkoutsBlock() {
  const { settings, isLoading, updateSettings } = useUserSettings()
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(settings?.defaultWeightUnit ?? 'lbs')
  const [intensityEnabled, setIntensityEnabled] = useState(settings?.intensityEnabled ?? false)
  const [intensityRating, setIntensityRating] = useState<'rpe' | 'rir'>(settings?.defaultIntensityRating ?? 'rir')
  const [loggingMode, setLoggingMode] = useState<'full' | 'follow_along'>(settings?.loggingMode || 'full')
  const [error, setError] = useState<string | null>(null)
  // Only the user's own changes are saved; values that arrive from a load are not.
  const [edited, setEdited] = useState(false)

  // Take new settings as they load (during render, so there is no flash).
  const [seenSettings, setSeenSettings] = useState(settings)
  if (settings && settings !== seenSettings) {
    setSeenSettings(settings)
    setWeightUnit(settings.defaultWeightUnit)
    setIntensityEnabled(settings.intensityEnabled)
    setIntensityRating(settings.defaultIntensityRating)
    setLoggingMode(settings.loggingMode || 'full')
  }

  // Auto-save after the user changes something (debounced to avoid rapid-fire requests)
  useEffect(() => {
    if (!edited) return

    const timeout = setTimeout(() => {
      setError(null)
      updateSettings({
        defaultWeightUnit: weightUnit,
        intensityEnabled,
        ...(intensityEnabled ? { defaultIntensityRating: intensityRating } : {}),
        loggingMode,
      }).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to save settings')
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [edited, weightUnit, intensityEnabled, intensityRating, loggingMode, updateSettings])

  return (
    <SettingsBlock title="Workouts" icon={<Dumbbell size={16} />}>
      {isLoading || !settings ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5 px-4 py-4">
          <div>
            <span id="workout-mode-label" className={`${LABEL} mb-2`}>
              Workout mode
            </span>
            <SegmentedControl
              aria-label="Workout mode"
              tone="bold"
              options={[
                { value: 'follow_along', label: 'Follow Along' },
                { value: 'full', label: 'Log Sets' },
              ]}
              value={loggingMode}
              onChange={(next) => {
                setEdited(true)
                if (next === 'follow_along') {
                  setLoggingMode('follow_along')
                  setIntensityEnabled(false)
                } else {
                  setLoggingMode('full')
                }
              }}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Follow Along guides you through exercises without tracking weights.
            </p>
          </div>

          {/* Intensity Tracking — only visible in Log Sets mode */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              loggingMode === 'full' ? 'grid-rows-[1fr] opacity-100' : '-mt-5 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              {/* The whole row is the switch, so the label toggles it too (48px tall). */}
              <button
                type="button"
                role="switch"
                aria-checked={intensityEnabled}
                aria-label="Toggle intensity tracking"
                onClick={() => {
                  setEdited(true)
                  setIntensityEnabled(!intensityEnabled)
                }}
                className="group flex min-h-12 w-full items-center justify-between gap-3 text-left doom-focus-ring"
              >
                <span className={LABEL}>Intensity tracking (RIR/RPE)</span>
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-7 w-12 min-w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
                    intensityEnabled ? 'border-primary bg-primary' : 'border-border bg-muted group-hover:border-primary'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full transition-transform ${
                      intensityEnabled ? 'translate-x-[22px] bg-primary-foreground' : 'translate-x-[2px] bg-muted-foreground'
                    }`}
                  />
                </span>
              </button>

              {/* RPE/RIR Selector — animated reveal when intensity is enabled */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  intensityEnabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mt-3">
                    <span id="intensity-rating-label" className={`${LABEL} mb-2`}>
                      Default rating type
                    </span>
                    <SegmentedControl
                      aria-label="Default rating type"
                      tone="bold"
                      options={[
                        { value: 'rpe', label: 'RPE' },
                        { value: 'rir', label: 'RIR' },
                      ]}
                      value={intensityRating}
                      onChange={(next) => {
                        setEdited(true)
                        setIntensityRating(next)
                      }}
                    />
                    <p className="mt-1 text-sm text-muted-foreground">
                      RPE = Rate of Perceived Exertion, RIR = Reps in Reserve
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </SettingsBlock>
  )
}
