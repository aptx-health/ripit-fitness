'use client'

import { useState } from 'react'
import { ALL_FAUS, FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import {
  getRatioPreset,
  RATIO_PRESETS,
  type RatioPresetId,
} from '@/lib/learning/ratio-presets'
import type { FauImportance } from '@/lib/user-training-profile'
import { ImportancePicker, SectionLabel } from '../goals-wizard/shared'

export type FauImportanceValue = {
  fauImportance: FauImportance
  fauImportancePreset: RatioPresetId | null
}

/** True if `ratings` already equals the preset's ratings exactly. */
function matchesPreset(ratings: FauImportance, presetId: RatioPresetId): boolean {
  const preset = getRatioPreset(presetId)
  if (!preset) return false
  return ALL_FAUS.every((fau) => ratings[fau] === preset.ratings[fau])
}

/** True if the user has rated at least one muscle. */
function hasAnyRating(ratings: FauImportance): boolean {
  return ALL_FAUS.some((fau) => ratings[fau] != null)
}

/**
 * Per-FAU importance editor with preset shortcuts. Used by both the Goals
 * Wizard focus step and the training-focus settings page. Presentational:
 * the parent owns persistence and passes the current value + an onChange.
 *
 * Applying a preset overwrites every rating (with confirmation when the user
 * has existing ratings that differ). Presets are a starting point, not a mode —
 * each rating stays editable afterward, and the applied preset id is retained
 * for "based on your X preset" attribution until another preset is applied.
 */
export function FauImportanceEditor({
  value,
  onChange,
}: {
  value: FauImportanceValue
  onChange: (next: FauImportanceValue) => void
}) {
  const { fauImportance: ratings, fauImportancePreset: presetId } = value
  const [pendingPreset, setPendingPreset] = useState<RatioPresetId | null>(null)

  const applyPreset = (id: RatioPresetId) => {
    const preset = getRatioPreset(id)
    if (!preset) return
    onChange({
      fauImportance: { ...preset.ratings },
      fauImportancePreset: id,
    })
    setPendingPreset(null)
  }

  const handlePresetClick = (id: RatioPresetId) => {
    // Already applied and untouched — reassert the id, nothing to confirm.
    if (matchesPreset(ratings, id)) {
      applyPreset(id)
      return
    }
    // Overwriting real edits (a fresh apply over hand-tuned values, or a
    // reapply after edits) needs a confirm; a blank slate applies directly.
    if (hasAnyRating(ratings)) {
      setPendingPreset(id)
    } else {
      applyPreset(id)
    }
  }

  const setRating = (fau: string, importance: number) => {
    onChange({
      fauImportance: { ...ratings, [fau]: importance },
      // Keep the preset id: editing refines a preset, it doesn't abandon it.
      fauImportancePreset: presetId,
    })
  }

  const appliedPreset = presetId ? getRatioPreset(presetId) : null
  const pending = pendingPreset ? getRatioPreset(pendingPreset) : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Start from a preset</SectionLabel>
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">
          A quick starting point — you can fine-tune every muscle below.
        </p>
        <div className="flex flex-col gap-2">
          {RATIO_PRESETS.map((preset) => {
            const active = presetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                aria-pressed={active}
                className={`w-full p-3 text-left transition-colors duration-150 min-h-12 ${
                  active
                    ? 'bg-success/10 border border-success'
                    : 'bg-card border border-border hover:border-muted-foreground/40'
                }`}
              >
                <span className="block text-sm font-semibold tracking-wider text-foreground">
                  {preset.label}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {preset.description}
                </span>
              </button>
            )
          })}
        </div>

        {pending && (
          <div className="mt-3 border border-border bg-muted/40 p-4">
            <p className="text-sm text-foreground">
              Replace your current ratings with the{' '}
              <span className="font-semibold">{pending.label}</span> preset?
              This overwrites every muscle.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset(pending.id)}
                className="min-h-11 flex-1 bg-success text-sm font-semibold uppercase tracking-wider text-success-foreground doom-focus-ring"
              >
                Apply preset
              </button>
              <button
                type="button"
                onClick={() => setPendingPreset(null)}
                className="min-h-11 flex-1 border border-border bg-card text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:border-muted-foreground/40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {appliedPreset && !pending && (
          <p className="mt-3 text-sm text-muted-foreground">
            Based on your{' '}
            <span className="font-semibold text-foreground">
              {appliedPreset.label}
            </span>{' '}
            preset. Tweak any muscle below.
          </p>
        )}
      </div>

      <div>
        <SectionLabel>Per-muscle importance</SectionLabel>
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">
          Higher means we prioritize it; lower means we spare the volume.
        </p>
        <div className="flex flex-col gap-5">
          {ALL_FAUS.map((fau) => (
            <div key={fau}>
              <span className="block text-sm font-medium tracking-wider text-foreground">
                {FAU_DISPLAY_NAMES[fau] ?? fau}
              </span>
              <ImportancePicker
                value={ratings[fau] ?? 0}
                onChange={(n) => setRating(fau, n)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
