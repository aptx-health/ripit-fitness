'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

type UserSettings = {
  displayName: string | null
  defaultWeightUnit: 'lbs' | 'kg'
  defaultIntensityRating: 'rpe' | 'rir'
}

type UserSettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSettings: UserSettings | null
  onSave: (settings: UserSettings) => Promise<void>
}

export default function UserSettingsModal({
  open,
  onOpenChange,
  currentSettings,
  onSave
}: UserSettingsModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [intensityRating, setIntensityRating] = useState<'rpe' | 'rir'>('rpe')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current settings when modal opens
  useEffect(() => {
    if (open && currentSettings) {
      setDisplayName(currentSettings.displayName || '')
      setWeightUnit(currentSettings.defaultWeightUnit)
      setIntensityRating(currentSettings.defaultIntensityRating)
      setError(null)
    }
  }, [open, currentSettings])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      await onSave({
        displayName: displayName.trim() || null,
        defaultWeightUnit: weightUnit,
        defaultIntensityRating: intensityRating
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border-2 border-primary shadow-xl z-50 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Settings size={24} className="text-primary" />
              User Settings
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="h-8 w-8 flex items-center justify-center border-2 border-border bg-muted hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <div className="space-y-5">
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
              <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Default Weight Unit
              </label>
              <div className="flex gap-2">
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
              </div>
            </div>

            {/* Intensity Rating */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Default Intensity Rating
              </label>
              <div className="flex gap-2">
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
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                RPE = Rate of Perceived Exertion, RIR = Reps in Reserve
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-error/10 border-2 border-error text-error text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary transition-colors font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover transition-colors font-semibold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
