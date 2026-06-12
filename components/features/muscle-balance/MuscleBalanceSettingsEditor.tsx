'use client'

import { ArrowLeft, CheckCircle2, RotateCcw, Save, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'
import {
  DEFAULT_LOOKBACK_WORKOUTS,
  DEFAULT_SECONDARY_WEIGHT,
  getDefaultMuscleBalanceTargets,
  updateMuscleBalanceSnapshotSettings,
} from '@/lib/muscle-balance'
import { clientLogger } from '@/lib/client-logger'
import MuscleBalancePanel from './MuscleBalancePanel'
import type {
  MuscleBalanceSettingsDTO,
  MuscleBalanceSnapshot,
  MuscleBalanceTargets,
} from './types'

type Props = {
  initialSnapshot: MuscleBalanceSnapshot
}

export default function MuscleBalanceSettingsEditor({ initialSnapshot }: Props) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [targets, setTargets] = useState<MuscleBalanceTargets>(
    initialSnapshot.settings.targets
  )
  const [lookbackWorkoutsInput, setLookbackWorkoutsInput] = useState(
    String(initialSnapshot.settings.lookbackWorkouts)
  )
  const [includeSecondary, setIncludeSecondary] = useState(
    initialSnapshot.settings.includeSecondary
  )
  const [secondaryWeight, setSecondaryWeight] = useState(
    initialSnapshot.settings.secondaryWeight
  )
  const [excludeWarmups, setExcludeWarmups] = useState(
    initialSnapshot.settings.excludeWarmups
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const lookbackWorkouts = parseLookbackWorkouts(lookbackWorkoutsInput)

  const targetTotal = useMemo(
    () => ALL_FAUS.reduce((sum, fau) => sum + targets[fau], 0),
    [targets]
  )
  const draftSettings = useMemo<MuscleBalanceSettingsDTO>(
    () => ({
      targets,
      lookbackWorkouts: lookbackWorkouts ?? snapshot.settings.lookbackWorkouts,
      includeSecondary,
      secondaryWeight,
      excludeWarmups,
    }),
    [
      targets,
      lookbackWorkouts,
      snapshot.settings.lookbackWorkouts,
      includeSecondary,
      secondaryWeight,
      excludeWarmups,
    ]
  )
  const previewSnapshot = useMemo(
    () => updateMuscleBalanceSnapshotSettings(snapshot, draftSettings),
    [snapshot, draftSettings]
  )

  const updateTarget = (fau: FAUKey, value: number) => {
    setSaved(false)
    setTargets((current) => ({ ...current, [fau]: value }))
  }

  const resetTargets = () => {
    setSaved(false)
    setTargets(getDefaultMuscleBalanceTargets())
    setLookbackWorkoutsInput(String(DEFAULT_LOOKBACK_WORKOUTS))
    setIncludeSecondary(true)
    setSecondaryWeight(DEFAULT_SECONDARY_WEIGHT)
    setExcludeWarmups(true)
  }

  const save = async () => {
    if (lookbackWorkouts === null) {
      setError('Completed workouts must be a whole number from 1 to 52.')
      return
    }
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload: MuscleBalanceSettingsDTO = {
        targets,
        lookbackWorkouts,
        includeSecondary,
        secondaryWeight,
        excludeWarmups,
      }
      const response = await fetch('/api/settings/muscle-balance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save muscle balance settings')
      }
      setSnapshot(data.snapshot)
      setTargets(data.snapshot.settings.targets)
      setLookbackWorkoutsInput(String(data.snapshot.settings.lookbackWorkouts))
      setIncludeSecondary(data.snapshot.settings.includeSecondary)
      setSecondaryWeight(data.snapshot.settings.secondaryWeight)
      setExcludeWarmups(data.snapshot.settings.excludeWarmups)
      setSaved(true)
      window.setTimeout(() => {
        router.push('/settings')
      }, 650)
    } catch (err) {
      clientLogger.error('Failed to save muscle balance settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
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
              Muscle Balance
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
            <span>
              {error || 'Muscle balance saved. Returning to settings.'}
            </span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="border-2 border-border bg-card p-4 sm:p-5 doom-corners">
            <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                  Target Ratios
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Set the ideal training share for each muscle. Equal values mean balanced training.
                </p>
              </div>
              <button
                type="button"
                onClick={resetTargets}
                className="inline-flex min-h-11 items-center gap-2 self-start border-2 border-border bg-muted px-3 py-2 text-sm font-bold uppercase tracking-wider text-foreground doom-focus-ring hover:border-primary"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="space-y-2 sm:space-y-5">
              {ALL_FAUS.map((fau) => {
                const value = targets[fau]
                const share = targetTotal > 0 ? (value / targetTotal) * 100 : 0
                return (
                  <MuscleTargetRow
                    key={fau}
                    fau={fau}
                    value={value}
                    share={share}
                    onChange={(next) => updateTarget(fau, next)}
                  />
                )
              })}
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="border-2 border-border bg-card p-4 doom-corners">
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                Window
              </h2>
              <label htmlFor="lookback-workouts" className="mt-4 block text-sm font-bold uppercase tracking-wider text-foreground">
                Completed workouts
              </label>
              <input
                id="lookback-workouts"
                type="number"
                min="1"
                max="52"
                value={lookbackWorkoutsInput}
                onChange={(event) => {
                  setSaved(false)
                  setError(null)
                  setLookbackWorkoutsInput(event.target.value)
                }}
                onBlur={() => {
                  if (lookbackWorkouts === null) {
                    setLookbackWorkoutsInput(String(snapshot.settings.lookbackWorkouts))
                    return
                  }
                  setLookbackWorkoutsInput(String(lookbackWorkouts))
                }}
                className="mt-2 w-full border-2 border-input bg-input px-3 py-2 font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
              />

              <div className="mt-5 space-y-4">
                <ToggleRow
                  label="Include secondary muscles"
                  checked={includeSecondary}
                  onChange={setIncludeSecondary}
                />
                {includeSecondary && (
                  <div>
                    <label htmlFor="secondary-weight" className="block text-sm font-bold uppercase tracking-wider text-foreground">
                      Secondary set credit: {secondaryWeight.toFixed(2)}
                    </label>
                    <input
                      id="secondary-weight"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={secondaryWeight}
                      onChange={(event) => {
                        setSaved(false)
                        setSecondaryWeight(Number(event.target.value))
                      }}
                      className="mt-2 h-11 w-full accent-primary"
                    />
                  </div>
                )}
                <ToggleRow
                  label="Ignore warmup sets"
                  checked={excludeWarmups}
                  onChange={setExcludeWarmups}
                />
              </div>
            </section>

            <MuscleBalancePanel snapshot={previewSnapshot} compact />
          </aside>
        </div>
      </div>
    </main>
  )
}

function MuscleTargetRow({
  fau,
  value,
  share,
  onChange,
}: {
  fau: FAUKey
  value: number
  share: number
  onChange: (value: number) => void
}) {
  const [open, setOpen] = useState(false)
  const label = FAU_DISPLAY_NAMES[fau]
  const formattedValue = formatRatio(value)

  return (
    <div className="border border-border/70 bg-muted/20 sm:border-0 sm:bg-transparent">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left doom-focus-ring sm:hidden"
        aria-expanded={open}
        aria-controls={`target-controls-${fau}`}
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-wider text-foreground">
            {label}
          </span>
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {share.toFixed(1)}% share
          </span>
        </span>
        <span className="border-2 border-border bg-input px-3 py-1 text-base font-bold tabular-nums text-foreground">
          {formattedValue}
        </span>
      </button>

      <div
        id={`target-controls-${fau}`}
        className={`${open ? 'grid' : 'hidden'} gap-3 px-3 pb-3 sm:grid sm:grid-cols-[150px_minmax(0,1fr)_74px] sm:items-center sm:px-0 sm:pb-0`}
      >
        <label
          htmlFor={`target-${fau}`}
          className="hidden text-sm font-bold uppercase tracking-wider text-foreground sm:block"
        >
          {label}
        </label>
        <input
          id={`target-${fau}`}
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 w-full accent-primary"
        />
        <div className="flex items-center justify-between gap-2 sm:block sm:text-right">
          <input
            type="number"
            min="0"
            max="2"
            step="0.05"
            value={formattedValue}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={`${label} target ratio`}
            className="w-24 border-2 border-input bg-input px-2 py-1 text-right font-bold tabular-nums text-foreground focus:border-primary focus:outline-none sm:w-20"
          />
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {share.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold uppercase tracking-wider text-foreground">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 min-w-14 items-center rounded-full border-2 transition-colors doom-focus-ring ${
          checked ? 'border-primary bg-primary' : 'border-border bg-muted'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform ${
            checked
              ? 'translate-x-[26px] bg-primary-foreground'
              : 'translate-x-[3px] bg-muted-foreground'
          }`}
        />
      </button>
    </div>
  )
}

function parseLookbackWorkouts(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) return null
  return parsed
}

function formatRatio(value: number): string {
  return Number(value.toFixed(2)).toString()
}
