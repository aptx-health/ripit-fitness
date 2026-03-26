'use client'

import { Dumbbell, Save } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ThemeSelector } from '@/components/ThemeSelector'
import { useUserSettings, type UserSettings } from '@/hooks/useUserSettings'

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useUserSettings()
  const [displayName, setDisplayName] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [intensityRating, setIntensityRating] = useState<'rpe' | 'rir'>('rpe')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName || '')
      setWeightUnit(settings.defaultWeightUnit)
      setIntensityRating(settings.defaultIntensityRating)
    }
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)

    try {
      await updateSettings({
        displayName: displayName.trim() || null,
        defaultWeightUnit: weightUnit,
        defaultIntensityRating: intensityRating,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty =
    settings &&
    (displayName !== (settings.displayName || '') ||
      weightUnit !== settings.defaultWeightUnit ||
      intensityRating !== settings.defaultIntensityRating)

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold">Settings</h1>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Theme */}
            <div>
              <span className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Theme
              </span>
              <ThemeSelector />
            </div>

            {/* Display Name */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for community program attribution
              </p>
            </div>

            {/* Weight Unit */}
            <div>
              <span
                id="weight-unit-label"
                className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Default Weight Unit
              </span>
              <fieldset
                className="flex gap-2"
                aria-labelledby="weight-unit-label"
              >
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    weightUnit === 'lbs'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  LBS
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    weightUnit === 'kg'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  KG
                </button>
              </fieldset>
            </div>

            {/* Intensity Rating */}
            <div>
              <span
                id="intensity-rating-label"
                className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Default Intensity Rating
              </span>
              <fieldset
                className="flex gap-2"
                aria-labelledby="intensity-rating-label"
              >
                <button
                  type="button"
                  onClick={() => setIntensityRating('rpe')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    intensityRating === 'rpe'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  RPE
                </button>
                <button
                  type="button"
                  onClick={() => setIntensityRating('rir')}
                  className={`flex-1 px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    intensityRating === 'rir'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  RIR
                </button>
              </fieldset>
              <p className="text-xs text-muted-foreground mt-1">
                RPE = Rate of Perceived Exertion, RIR = Reps in Reserve
              </p>
            </div>

            {/* Save Button */}
            {error && (
              <div className="p-3 bg-error/10 border-2 border-error text-error text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`w-full px-4 py-3 border-2 font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
                saved
                  ? 'bg-success text-white border-success'
                  : 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover'
              }`}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save'}
            </button>

            {/* Admin */}
            <div className="pt-4 border-t border-border">
              <span className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Admin
              </span>
              <Link
                href="/admin/exercises"
                className="w-full px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary hover:border-primary transition-colors font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
              >
                <Dumbbell size={18} />
                Manage Exercise Definitions
              </Link>
            </div>

            {/* Sign Out */}
            <div className="pt-4 border-t border-border">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-danger text-danger-foreground hover:bg-danger-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
