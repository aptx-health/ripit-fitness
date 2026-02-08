'use client'

import { useEffect } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'

interface PrescribedSet {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

interface SetLoggingFormProps {
  prescribedSet: PrescribedSet | undefined
  hasLoggedAllPrescribed: boolean
  hasRpe: boolean
  hasRir: boolean
  currentSet: {
    reps: string
    weight: string
    weightUnit: 'lbs' | 'kg'
    rpe: string
    rir: string
  }
  onSetChange: (setData: {
    reps: string
    weight: string
    weightUnit: 'lbs' | 'kg'
    rpe: string
    rir: string
  }) => void
}

export default function SetLoggingForm({
  prescribedSet,
  hasLoggedAllPrescribed,
  hasRpe,
  hasRir,
  currentSet,
  onSetChange,
}: SetLoggingFormProps) {
  const { settings } = useUserSettings()

  // Update weight unit when settings change
  useEffect(() => {
    if (settings?.defaultWeightUnit && currentSet.weightUnit !== settings.defaultWeightUnit) {
      onSetChange({
        ...currentSet,
        weightUnit: settings.defaultWeightUnit
      })
    }
  }, [settings?.defaultWeightUnit, currentSet, onSetChange])

  if (hasLoggedAllPrescribed) {
    return (
      <div className="bg-success-muted border-2 border-success-border p-4 text-center flex-shrink-0">
        <div className="text-success-text font-bold mb-2 uppercase tracking-wider">
          All prescribed sets logged!
        </div>
        <p className="text-sm text-success-text">
          Continue to next exercise or complete workout
        </p>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0">
      <div className="space-y-3">
        {/* Reps and Weight - Side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
              Reps *
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={currentSet.reps}
              onChange={(e) =>
                onSetChange({ ...currentSet, reps: e.target.value })
              }
              placeholder={prescribedSet?.reps.toString() || '0'}
              className="w-full px-4 py-3 text-lg border-2 border-input focus:ring-2 focus:ring-primary focus:border-primary bg-muted text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
              Weight * ({currentSet.weightUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={currentSet.weight}
              onChange={(e) =>
                onSetChange({ ...currentSet, weight: e.target.value })
              }
              placeholder={prescribedSet?.weight?.replace(/[^0-9.]/g, '') || '0'}
              className="w-full px-4 py-3 text-lg border-2 border-input focus:ring-2 focus:ring-primary focus:border-primary bg-muted text-foreground"
            />
          </div>
        </div>

        {/* Optional RPE/RIR */}
        {(hasRpe || hasRir) && (
          <div className="grid grid-cols-2 gap-3">
            {hasRir && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
                  RIR (optional)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10"
                  value={currentSet.rir}
                  onChange={(e) =>
                    onSetChange({ ...currentSet, rir: e.target.value })
                  }
                  placeholder={prescribedSet?.rir?.toString() || '—'}
                  className="w-full px-4 py-3 text-lg border-2 border-input focus:ring-2 focus:ring-primary focus:border-primary bg-muted text-foreground"
                />
              </div>
            )}

            {hasRpe && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
                  RPE (optional)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  value={currentSet.rpe}
                  onChange={(e) =>
                    onSetChange({ ...currentSet, rpe: e.target.value })
                  }
                  placeholder={prescribedSet?.rpe?.toString() || '—'}
                  className="w-full px-4 py-3 text-lg border-2 border-input focus:ring-2 focus:ring-primary focus:border-primary bg-muted text-foreground"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
