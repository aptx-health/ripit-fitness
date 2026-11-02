'use client'

import { Check, Dumbbell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROW_LABEL, SettingsBlock } from '@/components/settings/SettingsBlock'
import SubpageHeader from '@/components/ui/SubpageHeader'
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

  // Saves on its own (debounced), so the header shows the save state, not a Save button.
  const status = (
    <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
      {saveState === 'saving' && 'Saving...'}
      {saveState === 'saved' && 'Saved'}
      {saveState === 'error' && <span className="text-error">Save failed, retry a change</span>}
    </span>
  )

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <SubpageHeader
          title="Equipment"
          intro="Workout suggestions only use exercises you have equipment for."
          action={status}
        />

        {isUnset && (
          <p className="mb-5 text-sm text-foreground">
            Assuming a full gym. Toggle off anything you&apos;re missing, or start from a preset.
          </p>
        )}

        <div className="space-y-6">
          {/* Presets: one row of chips */}
          <div>
            <span className={`${ROW_LABEL} mb-2 text-muted-foreground`}>Presets</span>
            {/* One row that scrolls sideways at phone width, so the presets never wrap. */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {EQUIPMENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.values)}
                  className="inline-flex min-h-12 shrink-0 items-center whitespace-nowrap bg-primary/15 px-3 text-[13px] font-bold uppercase tracking-wider text-foreground hover:bg-primary/25 doom-focus-ring"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {EQUIPMENT_CHECKLIST_GROUPS.map((group) => (
            <SettingsBlock key={group.id} title={group.label} icon={<Dumbbell size={16} />}>
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
                    className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 doom-focus-ring"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                      }`}
                    >
                      {checked && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={`${ROW_LABEL} ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {EQUIPMENT_LABELS[value]}
                    </span>
                  </button>
                )
              })}
            </SettingsBlock>
          ))}
        </div>
      </div>
    </main>
  )
}
