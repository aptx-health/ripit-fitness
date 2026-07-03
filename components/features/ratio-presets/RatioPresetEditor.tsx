'use client'

import { ArrowLeft, CheckCircle2, Save, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clientLogger } from '@/lib/client-logger'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'
import {
  applyRatioPreset,
  detectAppliedPreset,
  getRatioPreset,
  RATIO_PRESETS,
  type RatioPresetId,
} from '@/lib/learning/ratio-presets'
import {
  type FauImportance,
  MAX_IMPORTANCE,
  MIN_IMPORTANCE,
} from '@/lib/user-training-profile'

type Props = {
  initialFauImportance: FauImportance
}

/** Neutral default for any FAU the user hasn't rated yet. */
const DEFAULT_IMPORTANCE = 3

type Ratings = Record<FAUKey, number>

function seedRatings(initial: FauImportance): Ratings {
  const result = {} as Ratings
  for (const fau of ALL_FAUS) {
    const value = initial[fau]
    result[fau] =
      typeof value === 'number' && value >= MIN_IMPORTANCE && value <= MAX_IMPORTANCE
        ? value
        : DEFAULT_IMPORTANCE
  }
  return result
}

export default function RatioPresetEditor({ initialFauImportance }: Props) {
  const router = useRouter()
  const [ratings, setRatings] = useState<Ratings>(() =>
    seedRatings(initialFauImportance)
  )
  const [pendingPreset, setPendingPreset] = useState<RatioPresetId | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const appliedPreset = useMemo(() => detectAppliedPreset(ratings), [ratings])

  const updateRating = (fau: FAUKey, value: number) => {
    setSaved(false)
    setRatings((current) => ({ ...current, [fau]: value }))
  }

  const confirmApplyPreset = () => {
    if (!pendingPreset) return
    const applied = applyRatioPreset(pendingPreset)
    if (applied) {
      setSaved(false)
      setError(null)
      setRatings(seedRatings(applied))
    }
    setPendingPreset(null)
  }

  const save = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch('/api/profile/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fauImportance: ratings }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save training focus')
      }
      setSaved(true)
      window.setTimeout(() => {
        router.push('/settings')
      }, 650)
    } catch (err) {
      clientLogger.error('Failed to save training focus:', err)
      setError(err instanceof Error ? err.message : 'Failed to save training focus')
    } finally {
      setIsSaving(false)
    }
  }

  const pendingPresetLabel = pendingPreset
    ? getRatioPreset(pendingPreset)?.label
    : null

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link
              href="/settings"
              className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground doom-focus-ring hover:text-foreground"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Settings
            </Link>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
              Training Focus
            </h1>
          </div>
          <Button type="button" variant="primary" doom loading={isSaving} onClick={save}>
            <Save size={16} aria-hidden="true" className="mr-1.5" />
            Save
          </Button>
        </div>

        {(error || saved) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`mb-5 flex items-start gap-3 border-2 p-3 text-sm font-semibold ${
              error
                ? 'border-error bg-error/10 text-error'
                : 'border-success bg-success/10 text-foreground'
            }`}
          >
            {error ? (
              <XCircle size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-success" />
            )}
            <span>{error || 'Training focus saved. Returning to settings.'}</span>
          </div>
        )}

        <section className="border-2 border-border bg-card p-4 sm:p-5 doom-corners">
          <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
            Start from a preset
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A preset is a starting point — pick one, then fine-tune any muscle below.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {RATIO_PRESETS.map((preset) => {
              const active = appliedPreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPendingPreset(preset.id)}
                  aria-pressed={active}
                  className={`flex flex-col gap-1 border-2 p-3 text-left transition-colors doom-focus-ring ${
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/20 hover:border-primary'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
                    {preset.label}
                    {active && (
                      <CheckCircle2
                        size={15}
                        aria-hidden="true"
                        className="text-primary"
                      />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {preset.description}
                  </span>
                </button>
              )
            })}
          </div>

          {pendingPreset && (
            <div
              role="alertdialog"
              aria-label={`Apply the ${pendingPresetLabel} preset`}
              className="mt-4 border-2 border-primary bg-primary/10 p-3"
            >
              <p className="text-sm font-semibold text-foreground">
                Apply the {pendingPresetLabel} preset? This overwrites your current
                importance ratings. You can still adjust individual muscles afterward.
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="primary" doom onClick={confirmApplyPreset}>
                  Apply preset
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  doom
                  onClick={() => setPendingPreset(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 border-2 border-border bg-card p-4 sm:p-5 doom-corners">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
              Muscle importance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {appliedPreset
                ? `Based on your ${getRatioPreset(appliedPreset)?.label} preset. Adjust any muscle to customize.`
                : 'Rate how much each muscle matters to you, from 1 (low) to 5 (high).'}
            </p>
          </div>

          <div className="mt-4 space-y-2 sm:space-y-4">
            {ALL_FAUS.map((fau) => (
              <ImportanceRow
                key={fau}
                fau={fau}
                value={ratings[fau]}
                onChange={(next) => updateRating(fau, next)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function ImportanceRow({
  fau,
  value,
  onChange,
}: {
  fau: FAUKey
  value: number
  onChange: (value: number) => void
}) {
  const label = FAU_DISPLAY_NAMES[fau]
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={`importance-${fau}`}
        className="w-24 shrink-0 text-sm font-bold uppercase tracking-wider text-foreground sm:w-[150px]"
      >
        {label}
      </label>
      <input
        id={`importance-${fau}`}
        type="range"
        min={MIN_IMPORTANCE}
        max={MAX_IMPORTANCE}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label} importance`}
        className="h-11 flex-1 accent-primary"
      />
      <span className="w-9 shrink-0 border-2 border-border bg-input py-1 text-center text-sm font-bold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  )
}
