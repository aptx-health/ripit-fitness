'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/radix/dialog'
import { clientLogger } from '@/lib/client-logger'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import type { ExerciseDefinition } from './ExerciseSearchInterface'

/**
 * Pieces shared by the two swap pickers (program SwapExerciseWizard and the
 * freestyle AdHocExercisePickerModal): a short header whose X cancels, flat
 * tap-to-pick rows, the Settings switch, and "More like this".
 */

export function SwapPickerHeader({
  title,
  subtitle,
  onClose,
  closeDisabled,
}: {
  title: string
  subtitle: ReactNode
  onClose: () => void
  closeDisabled?: boolean
}) {
  return (
    <DialogHeader className="border-b border-border bg-primary py-1.5! pl-4! pr-1! sm:pl-6!">
      <div className="flex items-center gap-2 text-left">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-lg font-bold uppercase leading-tight tracking-wider text-primary-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="truncate text-sm font-bold uppercase tracking-wide text-primary-foreground/75">
            {subtitle}
          </DialogDescription>
        </div>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onClose}
          disabled={closeDisabled}
          className="flex h-12 w-12 shrink-0 items-center justify-center text-primary-foreground doom-focus-ring disabled:opacity-50"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
    </DialogHeader>
  )
}

/**
 * Height-animated reveal (the grid-rows trick from Settings). Closed content
 * stays mounted for the animation but is hidden from taps and screen readers.
 */
export function Reveal({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      inert={!open}
      className={`grid flex-shrink-0 transition-all duration-300 ease-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

/** The Settings switch (LookBlock, WorkoutsBlock): the whole row toggles, pill track on the right. */
export function SwitchRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="group flex min-h-12 w-full items-center justify-between gap-3 px-4 py-1.5 text-left doom-focus-ring disabled:opacity-50 sm:px-6"
    >
      <span className="min-w-0">
        <span className="block font-bold uppercase tracking-wide text-foreground">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 min-w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
          checked ? 'border-primary bg-primary' : 'border-border bg-muted group-hover:border-primary'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform ${
            checked ? 'translate-x-[22px] bg-primary-foreground' : 'translate-x-[2px] bg-muted-foreground'
          }`}
        />
      </span>
    </button>
  )
}

const fauName = (fau: string) => FAU_DISPLAY_NAMES[fau] || fau
const equipmentName = (eq: string) => EQUIPMENT_LABELS[eq] || eq.replace(/_/g, ' ')

export function SwapSectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-4 pb-1 pt-3 sm:px-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>
      {right}
    </div>
  )
}

/** Flat divided rows; a tap picks the exercise. */
export function SwapExerciseList({
  label,
  exercises,
  onSelect,
}: {
  label: string
  exercises: ExerciseDefinition[]
  onSelect: (exercise: ExerciseDefinition) => void
}) {
  return (
    <ul aria-label={label} className="border-t border-border">
      {exercises.map((exercise) => (
        <li key={exercise.id} className="border-b border-border">
          <button
            type="button"
            onClick={() => onSelect(exercise)}
            className="block min-h-14 w-full px-4 py-2 text-left transition-colors hover:bg-muted/50 doom-focus-ring sm:px-6"
          >
            <span className="block truncate text-[15px] font-bold uppercase leading-snug tracking-wide text-foreground">
              {exercise.name}
            </span>
            <span className="block truncate text-sm leading-snug text-muted-foreground">
              {[exercise.primaryFAUs.map(fauName).join(', '), exercise.equipment.map(equipmentName).join(', ')]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap border-2 px-3 text-xs font-bold uppercase tracking-wider transition-colors doom-focus-ring ${
        pressed ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-foreground'
      }`}
    >
      {pressed && <Check size={14} aria-hidden="true" />}
      {children}
    </button>
  )
}

export type SwapSource = { primaryFAUs: string[]; equipment: string[] }

/**
 * "More like this" under the Similar list: chips for the current exercise's
 * muscles and equipment, all on at first, and a list of further exercises that
 * work any muscle left on and use any equipment left on (the search route's
 * faus/equipment filters). Exercises already in Similar are left out.
 */
export function MoreLikeThis({
  source,
  excludeIds,
  onSelect,
}: {
  source: SwapSource
  excludeIds: string[]
  onSelect: (exercise: ExerciseDefinition) => void
}) {
  const [open, setOpen] = useState(false)
  const [faus, setFaus] = useState<string[]>(source.primaryFAUs)
  const [equipment, setEquipment] = useState<string[]>(source.equipment)
  // Results are tagged with the query they answer, so a chip change shows
  // "Loading..." until its own answer lands (no reset inside the effect).
  const [results, setResults] = useState<{ query: string; exercises: ExerciseDefinition[] | 'failed' } | null>(null)
  const none = faus.length === 0 && equipment.length === 0
  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '50' })
    if (faus.length) params.set('faus', faus.join(','))
    if (equipment.length) params.set('equipment', equipment.join(','))
    return params.toString()
  }, [faus, equipment])

  useEffect(() => {
    if (!open || none) return
    let cancelled = false
    fetch(`/api/exercises/search?${query}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`More like this request failed (${response.status})`)
        const body = (await response.json()) as { exercises: ExerciseDefinition[] }
        if (!cancelled) setResults({ query, exercises: body.exercises })
      })
      .catch((error) => {
        clientLogger.error('Error loading more like this:', error)
        if (!cancelled) setResults({ query, exercises: 'failed' })
      })
    return () => {
      cancelled = true
    }
  }, [open, none, query])

  const current = results?.query === query ? results.exercises : null
  const failed = current === 'failed'
  const shown = useMemo(() => {
    if (current === null || current === 'failed') return null
    const skip = new Set(excludeIds)
    return current.filter((e) => !skip.has(e.id))
  }, [current, excludeIds])

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left doom-focus-ring sm:px-6"
      >
        <span className="flex-1 text-sm font-bold uppercase tracking-wider text-primary">More like this</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`text-primary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-6">
            {source.primaryFAUs.map((fau) => (
              <Chip key={fau} pressed={faus.includes(fau)} onClick={() => setFaus((f) => toggle(f, fau))}>
                {fauName(fau)}
              </Chip>
            ))}
            {source.equipment.map((eq) => (
              <Chip key={eq} pressed={equipment.includes(eq)} onClick={() => setEquipment((e) => toggle(e, eq))}>
                {equipmentName(eq)}
              </Chip>
            ))}
          </div>
          {none ? (
            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">Turn on a muscle or equipment to see more.</p>
          ) : failed ? (
            <p className="px-4 py-4 text-sm text-error sm:px-6">Couldn&apos;t load more exercises.</p>
          ) : shown === null ? (
            <p className="px-4 py-4 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:px-6">Loading...</p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">Nothing else matches these.</p>
          ) : (
            <SwapExerciseList label="More like this" exercises={shown} onSelect={onSelect} />
          )}
        </>
      )}
    </section>
  )
}
