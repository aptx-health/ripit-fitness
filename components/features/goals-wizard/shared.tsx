'use client'

import type { ReactNode } from 'react'
import { IMPORTANCE_LABELS } from './constants'

/** Uppercase section label matching the settings/onboarding form language. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
      {children}
    </span>
  )
}

/**
 * Tappable card used for both single- and multi-select. Mirrors the onboarding
 * `SelectionCard` look (success accent when active, checkmark, 44px+ target).
 */
export function SelectCard({
  label,
  description,
  isSelected,
  onClick,
}: {
  label: string
  description?: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`w-full p-4 text-left cursor-pointer relative transition-colors duration-150 min-h-12 ${
        isSelected
          ? 'bg-success/10 border border-success'
          : 'bg-card border border-border hover:border-muted-foreground/40'
      }`}
    >
      {isSelected && (
        <span className="absolute top-3 right-3 text-success text-base font-bold">
          &#10003;
        </span>
      )}
      <span className="block text-sm font-medium tracking-wider text-foreground pr-6">
        {label}
      </span>
      {description && (
        <span className="block mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      )}
    </button>
  )
}

/** Compact 1-5 importance picker shown under a selected goal/activity. */
export function ImportancePicker({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="mt-3">
      <div className="flex gap-1.5" role="group" aria-label="How important is this?">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              className={`flex-1 min-h-11 text-sm font-semibold border transition-colors ${
                active
                  ? 'bg-success text-success-foreground border-success'
                  : 'bg-muted text-muted-foreground border-border hover:border-muted-foreground/40'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {IMPORTANCE_LABELS[value] ?? 'How much does this matter?'}
      </p>
    </div>
  )
}

/** Small pill toggle for dense multi-selects (e.g. preferred days). */
export function PillToggle({
  label,
  isSelected,
  onClick,
}: {
  label: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`min-h-11 px-3 text-sm font-semibold uppercase tracking-wider border transition-colors ${
        isSelected
          ? 'bg-success/10 text-foreground border-success'
          : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'
      }`}
    >
      {label}
    </button>
  )
}

/** Labeled numeric input with an optional trailing unit. */
export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  unit,
  min,
  max,
  inputMode = 'numeric',
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  unit?: string
  min?: number
  max?: number
  inputMode?: 'numeric' | 'decimal'
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="flex items-stretch">
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          value={value}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-12 px-3 py-2 bg-input border border-border text-foreground placeholder:text-muted-foreground doom-focus-ring"
        />
        {unit && (
          <span className="flex items-center px-3 text-sm text-muted-foreground border border-l-0 border-border bg-muted">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
