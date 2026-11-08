'use client'

import { ChevronDown, CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useReducedMotion } from '@/lib/display'
import { type PlannedSet, summarizePlan, workingSets } from '@/lib/workout-logging/plan-summary'
import type { LoggedSet } from '@/types/workout'

/**
 * The plan of an exercise started from a saved or generated workout: one
 * summary line ("Target 3 × 8 @ RPE 8 · set 2 next") that expands to the
 * planned sets, each marked done (with what was logged) or next. Nothing for
 * an exercise without a plan. A finished plan shows a check; the set that
 * finishes it also flashes the line once (not with reduced motion or E-ink display).
 */

const STORAGE_KEY = 'ripit:logger-plan-expanded'

/** Expanded or not, one choice for every exercise, remembered on this device when storage allows. */
export function usePlanExpanded(): [boolean, () => void] {
  const [expanded, setExpanded] = useState(false)
  // Read after mount: the server render can't see the device's choice.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // Storage blocked: the choice lasts for this session only.
    }
  }, [])
  const toggle = useCallback(() => {
    const next = !expanded
    setExpanded(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // As above.
    }
  }, [expanded])
  return [expanded, toggle]
}

/**
 * How many times this exercise's plan has just been finished: up by one when a
 * logged set takes `count` from below `total` to exactly `total`. Mounting,
 * moving to another exercise or extra sets don't count; dropping below and
 * finishing again does. Tracked during render (React's "adjust state when a
 * prop changes"), so there is no timer: the flash is a CSS animation replayed
 * by key.
 */
function useFinishes(exerciseId: string, count: number, total: number): number {
  const [seen, setSeen] = useState({ exerciseId, count })
  const [finishes, setFinishes] = useState(0)
  if (seen.exerciseId !== exerciseId || seen.count !== count) {
    const sameExercise = seen.exerciseId === exerciseId
    setSeen({ exerciseId, count })
    if (!sameExercise) setFinishes(0)
    else if (total > 0 && seen.count < total && count === total) setFinishes((n) => n + 1)
  }
  return finishes
}

/** "8 @ RPE 8", "12 @ 2 RIR", or "60". */
function target(set: PlannedSet): string {
  if (set.rpe != null) return `${set.reps} @ RPE ${set.rpe}`
  if (set.rir != null) return `${set.reps} @ ${set.rir} RIR`
  return set.reps
}

/** What was logged: "8 × 135 lbs", or "12 reps" for bodyweight. */
function logged(set: LoggedSet): string {
  return set.weight > 0 ? `${set.reps} × ${set.weight} ${set.weightUnit}` : `${set.reps} reps`
}

export default function PlanLine({
  exerciseId,
  prescribedSets,
  loggedSets,
  expanded,
  onToggle,
}: {
  exerciseId: string
  prescribedSets: PlannedSet[]
  /** This exercise's logged sets. */
  loggedSets: LoggedSet[]
  expanded: boolean
  onToggle: () => void
}) {
  const working = loggedSets.filter((s) => !s.isWarmup).sort((a, b) => a.setNumber - b.setNumber)
  const plan = workingSets(prescribedSets)
  // A set that failed to save doesn't finish the plan.
  const saved = working.filter((s) => s._syncStatus !== 'error').length
  const finishes = useFinishes(exerciseId, saved, plan.length)
  const reducedMotion = useReducedMotion()
  const summary = summarizePlan(prescribedSets, working.length)
  if (summary == null) return null
  const finished = saved >= plan.length

  return (
    <div className="relative border-2 border-border bg-muted/40">
      {finishes > 0 && !reducedMotion && (
        <span key={finishes} data-plan-flash aria-hidden="true" className="doom-set-logged pointer-events-none absolute inset-0" />
      )}
      <button
        type="button"
        data-plan-line
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center gap-2 px-3 text-left doom-focus-ring"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target</span>{' '}
        <span className="min-w-0 flex-1 truncate text-sm font-bold tabular-nums text-foreground">{summary}</span>
        {finished && <CircleCheck data-plan-done size={18} aria-hidden="true" className="shrink-0 text-success-text" />}
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <ol aria-label="Planned sets" className="divide-y divide-border border-t border-border">
          {plan.map((set, i) => {
            const done = working[i]
            const isNext = i === working.length
            return (
              <li key={set.setNumber} className="flex min-h-10 items-center gap-3 px-3 py-1.5 text-sm tabular-nums">
                <span className="w-12 shrink-0 font-bold text-muted-foreground">Set {i + 1}</span>{' '}
                <span className="min-w-0 flex-1 text-foreground">{target(set)}</span>{' '}
                {done ? (
                  <span className="shrink-0 text-success-text">
                    <span className="font-bold uppercase tracking-wider text-xs">done</span> {logged(done)}
                  </span>
                ) : isNext ? (
                  <span className="shrink-0 bg-accent px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-accent-foreground">
                    next
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
