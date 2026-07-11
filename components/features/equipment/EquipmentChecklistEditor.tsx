'use client'

import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import {
  EQUIPMENT_CHECKLIST_GROUPS,
  EQUIPMENT_CHECKLIST_VALUES,
  EQUIPMENT_PRESETS,
} from '@/lib/equipment-availability'

type Props = {
  /** Saved equipment list (may be empty if the user owns almost nothing). */
  initialEquipment: string[]
  /**
   * Whether the user has an explicit equipment record. `false` = no record,
   * so the planner assumes a full gym and the checklist starts all-on behind
   * a banner. `true` = show the saved selection verbatim, even if empty.
   */
  initialSet: boolean
}

/**
 * Equipment availability checklist (issue #927). With no record
 * (`initialSet === false`), the planner assumes a full commercial gym, so the
 * unset state renders every toggle ON behind an explanatory banner. The first
 * interaction materializes the full list minus whatever was toggled off, then
 * changes auto-save (debounced) and mark the record as set — so an intentional
 * empty selection persists instead of snapping back to "full gym" on reload.
 */
export default function EquipmentChecklistEditor({
  initialEquipment,
  initialSet,
}: Props) {
  // null = no saved record (assume full gym). An empty-but-set record stays [].
  const [selected, setSelected] = useState<string[] | null>(
    initialSet ? initialEquipment : null
  )
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const dirtyRef = useRef(false)

  const isUnset = selected === null
  const effective = selected ?? [...EQUIPMENT_CHECKLIST_VALUES]

  const toggle = (value: string) => {
    dirtyRef.current = true
    setSaveState('idle')
    setSelected((current) => {
      const base = current ?? [...EQUIPMENT_CHECKLIST_VALUES]
      return base.includes(value)
        ? base.filter((v) => v !== value)
        : [...base, value]
    })
  }

  const applyPreset = (values: string[]) => {
    dirtyRef.current = true
    setSaveState('idle')
    setSelected([...values])
  }

  // Debounced auto-save after any user change. The cleanup aborts any
  // in-flight request so a superseded save can't report "Saved" (or write
  // stale state updates) after a newer change queued its own save.
  useEffect(() => {
    if (!dirtyRef.current || selected === null) return
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setSaveState('saving')
      try {
        const res = await fetch('/api/profile/training', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipmentAvailable: selected }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Save failed (${res.status})`)
        setSaveState('saved')
      } catch (err) {
        if (controller.signal.aborted) return
        clientLogger.error('Failed to save equipment availability', err)
        setSaveState('error')
      }
    }, 500)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [selected])

  return (
    <div className="bg-background px-4 sm:px-6 py-8">
      <div className="max-w-md md:max-w-2xl mx-auto space-y-6">
        <div>
          <Link
            href="/settings"
            className="relative mb-4 inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground doom-focus-ring before:content-[''] before:absolute before:-inset-3"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Settings
          </Link>
          <h1 className="text-xl font-bold">Equipment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workout suggestions only use exercises you have equipment for.
          </p>
        </div>

        {isUnset && (
          <div className="border-2 border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
            Assuming a full gym. Toggle off anything you&apos;re missing, or
            start from a preset.
          </div>
        )}

        {/* Presets */}
        <div>
          <span className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Presets
          </span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.values)}
                className="min-h-11 px-4 py-2 border-2 border-border bg-muted text-foreground font-semibold uppercase tracking-wider text-sm transition-colors hover:border-primary hover:bg-secondary doom-focus-ring"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Available Equipment
            </span>
            <span
              className="text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved'}
              {saveState === 'error' && (
                <span className="text-error">Save failed, retry a change</span>
              )}
            </span>
          </div>

          {EQUIPMENT_CHECKLIST_GROUPS.map((group) => (
            <div key={group.id}>
              <span className="block text-xs font-semibold text-muted-foreground/80 mb-2 uppercase tracking-wider">
                {group.label}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.values.map((value) => {
                  const checked = effective.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`${EQUIPMENT_LABELS[value]} available`}
                      onClick={() => toggle(value)}
                      className={`flex min-h-11 items-center gap-3 border-2 px-3 py-2 text-left text-sm font-semibold uppercase tracking-wider transition-colors doom-focus-ring ${
                        checked
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-muted text-muted-foreground hover:border-primary'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background'
                        }`}
                      >
                        {checked && <Check size={14} strokeWidth={3} />}
                      </span>
                      {EQUIPMENT_LABELS[value]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
