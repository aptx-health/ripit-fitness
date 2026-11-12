import { type EffortScale, inScale } from '@/lib/insights/effort-scale'

/** Text for the Progress report: dates, durations, effort and signed changes. */

export const DASH = '–'
const MINUS = '−'

/** The browser's IANA zone, sent with every Progress request; UTC when it can't tell. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 'YYYY-MM-DD' as "Oct 26". */
export function weekOfLabel(weekStart: string): string {
  return new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "RPE" or "RIR". */
export function effortLabel(scale: EffortScale): string {
  return scale === 'rir' ? 'RIR' : 'RPE'
}

/** An RPE-scale effort in the user's scale to one decimal, or "–" when there is no number. */
export function formatEffort(rpe: number | null, scale: EffortScale): string {
  return rpe == null ? DASH : inScale(rpe, scale).toFixed(1)
}

/** The effort with its label: "RPE 8.0", "RIR 2.0". */
export function labelledEffort(rpe: number | null, scale: EffortScale): string {
  return `${effortLabel(scale)} ${formatEffort(rpe, scale)}`
}

/**
 * An effort inside a note ("normal …", "8.0 → 8.7"): bare in RPE, as the page
 * always read, and labelled in RIR ("RIR 2.0"), where a lower number is harder.
 */
export function noteEffort(rpe: number | null, scale: EffortScale): string {
  return scale === 'rir' ? labelledEffort(rpe, scale) : formatEffort(rpe, scale)
}

/** The hard-set line under the effort tile: sets at RPE 9+ (RIR 1 or less) and at 10 (RIR 0). */
export function hardSetsText(pctAtOrAbove9: number, setsAt10: string, scale: EffortScale): string {
  return scale === 'rir'
    ? `${pctAtOrAbove9}% of sets at RIR 1 or less · ${setsAt10} at RIR 0`
    : `${pctAtOrAbove9}% of sets at 9+ · ${setsAt10} at 10`
}

/** Whole minutes as "3h 22m", or "45m" under an hour. */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(Math.abs(totalMinutes))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/** A change with its sign: "+14%", "−0.4", "+21m". Zero has no sign. */
export function signed(value: number, text: (abs: number) => string): string {
  const body = text(Math.abs(value))
  if (body === text(0)) return body
  return `${value > 0 ? '+' : MINUS}${body}`
}

/** A weight to at most one decimal, with no trailing ".0": 275, 102.5. */
export function formatWeight(weight: number): string {
  return String(Math.round(weight * 10) / 10)
}

/** "lb" or "kg". */
export function unitLabel(unit: 'lbs' | 'kg'): string {
  return unit === 'kg' ? 'kg' : 'lb'
}

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}
