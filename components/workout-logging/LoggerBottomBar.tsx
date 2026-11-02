'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pluralize } from '@/lib/format/pluralize'

/**
 * The workout logger's one bottom bar (direction A, a flat folder bar), for
 * the program logger, follow-along and freestyle: an outline Previous square,
 * the one filled accent main button (with an optional second line, e.g.
 * "8 reps × 135 lbs"), and on the right an outline Next square or a labelled
 * outline button ("Next exercise", "Finish"). It never disappears mid-workout.
 */

export interface LoggerBottomBarProps {
  previous?: { onClick: () => void; disabled?: boolean }
  main: {
    label: string
    detail?: string
    onClick: () => void
    disabled?: boolean
    /** `primary` (green, with a chevron for "Next exercise") for moving on: the done state's main action. */
    tone?: 'accent' | 'primary'
  }
  /** An outline action between Previous and the main button: the done state's "+ Extra set". */
  secondary?: { label: string; onClick: () => void; disabled?: boolean }
  next?: { onClick: () => void; disabled?: boolean; label?: string }
}

/**
 * The Log set button's second line: what will be saved, from what the form
 * holds. "8 reps × 135 lbs"; no weight (or 0) reads "8 reps" (bodyweight);
 * nothing entered yet, no line.
 */
export function pendingSetDetail(set: { reps: string; weight: string; weightUnit: string }): string | undefined {
  const reps = Number.parseInt(set.reps, 10)
  if (!set.reps || Number.isNaN(reps)) return undefined
  const weight = Number.parseFloat(set.weight)
  const repsText = pluralize(reps, 'rep')
  return set.weight && weight > 0 ? `${repsText} × ${set.weight} ${set.weightUnit}` : repsText
}

/**
 * Off is still an outline (never faded with opacity): a fainter border and
 * muted text, so it reads as off in every theme.
 */
const outline = (disabled?: boolean) =>
  `border-2 bg-card doom-focus-ring ${
    disabled ? 'border-border/50 text-muted-foreground cursor-not-allowed' : 'border-border text-foreground hover:bg-muted'
  }`

/** An off button's icon, fainter still than its border. */
const iconTone = (disabled?: boolean) => (disabled ? 'text-muted-foreground/60' : undefined)

const MAIN_TONE = {
  accent: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-[0_3px_0_var(--accent-active,var(--accent-hover))]',
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_3px_0_var(--primary-active)]',
}
/** An off main button: no fill, a dashed outline and muted text, clearly not pressable. */
const MAIN_OFF = 'border-2 border-dashed border-border bg-muted text-muted-foreground cursor-not-allowed'

export default function LoggerBottomBar({ previous, main, secondary, next }: LoggerBottomBarProps) {
  return (
    <div
      data-testid="logger-bottom-bar"
      className="flex-shrink-0 bg-card border-t-2 border-secondary px-4 pt-3"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-stretch gap-2">
        {previous && (
          <button
            type="button"
            onClick={previous.disabled ? undefined : previous.onClick}
            disabled={previous.disabled}
            aria-label="Previous exercise"
            className={`flex h-12 w-12 shrink-0 items-center justify-center ${outline(previous.disabled)}`}
          >
            <ChevronLeft size={22} strokeWidth={2.5} aria-hidden="true" className={iconTone(previous.disabled)} />
          </button>
        )}

        {secondary && (
          <button
            type="button"
            onClick={secondary.disabled ? undefined : secondary.onClick}
            disabled={secondary.disabled}
            className={`flex h-12 shrink-0 items-center justify-center px-3 text-sm font-bold uppercase tracking-wider ${outline(secondary.disabled)}`}
          >
            {secondary.label}
          </button>
        )}

        <button
          type="button"
          onClick={main.disabled ? undefined : main.onClick}
          disabled={main.disabled}
          className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center px-3 py-1 doom-focus-ring ${
            main.disabled ? MAIN_OFF : MAIN_TONE[main.tone ?? 'accent']
          }`}
        >
          <span className="inline-flex items-center gap-1 text-base font-bold uppercase leading-tight tracking-widest">
            {main.label}
            {main.tone === 'primary' && main.label === 'Next exercise' && (
              <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
            )}
          </span>
          {main.detail && (
            <span className="text-xs font-semibold leading-tight tracking-wide normal-case">{main.detail}</span>
          )}
        </button>

        {next &&
          (next.label ? (
            <button
              type="button"
              onClick={next.disabled ? undefined : next.onClick}
              disabled={next.disabled}
              className={`flex h-12 shrink-0 items-center justify-center gap-1 px-3 text-sm font-bold uppercase tracking-wider ${outline(next.disabled)}`}
            >
              {next.label}
              {next.label !== 'Finish' && <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={next.disabled ? undefined : next.onClick}
              disabled={next.disabled}
              aria-label="Next exercise"
              className={`flex h-12 w-12 shrink-0 items-center justify-center ${outline(next.disabled)}`}
            >
              <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" className={iconTone(next.disabled)} />
            </button>
          ))}
      </div>
    </div>
  )
}
