/** Text for the Progress report: dates, durations and signed changes. */

export const DASH = '–'
const MINUS = '−'

/** 'YYYY-MM-DD' as "Oct 26". */
export function weekOfLabel(weekStart: string): string {
  return new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** One decimal, or "–" when there is no number. */
export function formatRpe(rpe: number | null): string {
  return rpe == null ? DASH : rpe.toFixed(1)
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
