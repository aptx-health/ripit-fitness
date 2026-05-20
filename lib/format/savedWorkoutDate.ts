/**
 * Compact "last done" date formatter used on the saved-workouts list.
 *
 * Buckets (relative to the current calendar day in local time):
 *   - same calendar day  -> "Today"
 *   - previous day       -> "Yesterday"
 *   - within 7 days back -> weekday short ("Wed")
 *   - within current year -> month + day ("May 14")
 *   - older              -> month + year ("May 2025")
 */

const weekdayFmt = new Intl.DateTimeFormat('en', { weekday: 'short' })
const monthDayFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const monthYearFmt = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const ONE_DAY_MS = 1000 * 60 * 60 * 24

export function formatSavedWorkoutDate(date: Date | string): string {
  const target = typeof date === 'string' ? new Date(date) : date
  const now = new Date()

  const targetDay = startOfDay(target).getTime()
  const nowDay = startOfDay(now).getTime()
  const dayDiff = Math.round((nowDay - targetDay) / ONE_DAY_MS)

  if (dayDiff === 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff > 1 && dayDiff < 7) return weekdayFmt.format(target)
  if (target.getFullYear() === now.getFullYear()) return monthDayFmt.format(target)
  return monthYearFmt.format(target)
}
