'use client'

import { CalendarRange, CheckCircle2, RotateCcw, Target, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import SaveButton from '@/components/settings/SaveButton'
import { OUTLINE_BUTTON, ROW_LABEL, SettingsBlock } from '@/components/settings/SettingsBlock'
import UnsavedChangesBar from '@/components/settings/UnsavedChangesBar'
import SubpageHeader from '@/components/ui/SubpageHeader'
import { clientLogger } from '@/lib/client-logger'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'
import {
  DEFAULT_LOOKBACK_WORKOUTS,
  DEFAULT_SECONDARY_WEIGHT,
  getDefaultMuscleBalanceTargets,
  updateMuscleBalanceSnapshotSettings,
} from '@/lib/muscle-balance'
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
      lookbackDays: snapshot.settings.lookbackDays,
      includeSecondary,
      secondaryWeight,
      excludeWarmups,
    }),
    [
      targets,
      lookbackWorkouts,
      snapshot.settings.lookbackWorkouts,
      snapshot.settings.lookbackDays,
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
        lookbackDays: snapshot.settings.lookbackDays,
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

  // Unsaved changes: anything differing from the last saved (or loaded) settings.
  const savedSettings = snapshot.settings
  const dirty =
    ALL_FAUS.some((fau) => targets[fau] !== savedSettings.targets[fau]) ||
    lookbackWorkoutsInput !== String(savedSettings.lookbackWorkouts) ||
    includeSecondary !== savedSettings.includeSecondary ||
    secondaryWeight !== savedSettings.secondaryWeight ||
    excludeWarmups !== savedSettings.excludeWarmups

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <SubpageHeader
          title="Muscle balance"
          intro="Set the ideal training share for each muscle. Equal values mean balanced training."
          action={<SaveButton dirty={dirty} saving={isSaving} onClick={save} />}
        />

        {(error || saved) && (
          <p
            role={error ? 'alert' : 'status'}
            className={`mb-5 flex items-start gap-2 text-sm font-semibold ${error ? 'text-error' : 'text-foreground'}`}
          >
            {error ? (
              <XCircle size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-success" />
            )}
            <span>{error || 'Muscle balance saved. Returning to settings.'}</span>
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <SettingsBlock title="Target ratios" icon={<Target size={16} />}>
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
            <div className="px-4 py-3">
              <button type="button" onClick={resetTargets} className={OUTLINE_BUTTON}>
                <RotateCcw size={14} aria-hidden="true" />
                Reset to defaults
              </button>
            </div>
          </SettingsBlock>

          <div className="space-y-6 lg:sticky lg:top-6">
            <SettingsBlock title="Window" icon={<CalendarRange size={16} />}>
              <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                <label htmlFor="lookback-workouts" className={ROW_LABEL}>
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
                  className={NUMBER_INPUT}
                />
              </div>
              <ToggleRow label="Include secondary muscles" checked={includeSecondary} onChange={setIncludeSecondary} />
              {includeSecondary && (
                <div className="px-4 py-3">
                  <label htmlFor="secondary-weight" className={ROW_LABEL}>
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
                    className="mt-2 h-12 w-full accent-primary"
                  />
                </div>
              )}
              <ToggleRow label="Ignore warmup sets" checked={excludeWarmups} onChange={setExcludeWarmups} />
            </SettingsBlock>

            <MuscleBalancePanel snapshot={previewSnapshot} compact />
          </div>
        </div>

        <UnsavedChangesBar dirty={dirty} saving={isSaving} onSave={save} />
      </div>
    </main>
  )
}

const NUMBER_INPUT =
  'min-h-12 w-20 shrink-0 border-2 border-input bg-input px-2 text-right font-bold tabular-nums text-foreground focus:border-primary focus:outline-none'

/** One muscle: name and share on the left, the ratio on the right (slider too on wider screens). */
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
  const label = FAU_DISPLAY_NAMES[fau]

  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
        <label htmlFor={`target-${fau}-number`} className={ROW_LABEL}>
          {label}
        </label>
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {share.toFixed(1)}% share
        </span>
      </div>
      <input
        id={`target-${fau}`}
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label} target ratio slider`}
        className="hidden h-12 min-w-0 flex-1 accent-primary sm:block"
      />
      <input
        id={`target-${fau}-number`}
        type="number"
        min="0"
        max="2"
        step="0.05"
        value={formatRatio(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label} target ratio`}
        className={NUMBER_INPUT}
      />
    </div>
  )
}

/** A row that is the switch, so the label toggles it too. */
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex min-h-12 w-full items-center justify-between gap-4 px-4 py-2 text-left doom-focus-ring"
    >
      <span className={ROW_LABEL}>{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-8 w-14 min-w-14 items-center rounded-full border-2 transition-colors ${
          checked ? 'border-primary bg-primary' : 'border-border bg-muted'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform ${
            checked ? 'translate-x-[26px] bg-primary-foreground' : 'translate-x-[3px] bg-muted-foreground'
          }`}
        />
      </span>
    </button>
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
