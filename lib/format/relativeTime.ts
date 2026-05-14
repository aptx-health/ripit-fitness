/**
 * Returns a humanized relative-time string like "Today", "Yesterday",
 * "5 days ago", "2 months ago", "1 year ago".
 *
 * Uses Intl.RelativeTimeFormat with `numeric: 'auto'` so single-unit deltas
 * collapse to "yesterday" / "tomorrow" naturally.
 *
 * Bucket order (compared by absolute days from now):
 *   - 0 days  -> "Today"
 *   - 1 day   -> "Yesterday" / "Tomorrow"
 *   - < 7     -> "N days ago" / "in N days"
 *   - < 30    -> "N weeks ago"
 *   - < 365   -> "N months ago"
 *   - >= 365  -> "N years ago"
 *
 * Examples:
 *   formatRelativeTime(new Date())  // "Today"
 *   formatRelativeTime(yesterday)   // "yesterday"
 *   formatRelativeTime(fiveDaysAgo) // "5 days ago"
 *   formatRelativeTime(oneMonthAgo) // "1 month ago"
 *
 * TODO: When i18n lands, switch 'en' to navigator.language or a user-pref token.
 */
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === 'string' ? new Date(date) : date
  const now = new Date()

  const diffInMs = now.getTime() - target.getTime()
  const oneDayMs = 1000 * 60 * 60 * 24
  const diffInDays = Math.floor(diffInMs / oneDayMs)
  const absDays = Math.abs(diffInDays)

  // Same-calendar-day fast path: today regardless of hour-level drift.
  if (absDays === 0) return 'Today'

  // Two formatters: `auto` collapses single-day deltas to "yesterday"/"tomorrow",
  // `always` keeps numeric units ("1 month ago" rather than "last month") since
  // numeric weeks/months/years read more naturally in this app.
  const rtfAuto = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const rtfAlways = new Intl.RelativeTimeFormat('en', { numeric: 'always' })

  // Past = negative deltas; future = positive. We use signed values so Intl
  // handles "ago" vs "in N" automatically.
  const sign = diffInDays > 0 ? -1 : 1

  if (absDays === 1) return rtfAuto.format(sign * 1, 'day')
  if (absDays < 7) return rtfAlways.format(sign * absDays, 'day')
  if (absDays < 30) return rtfAlways.format(sign * Math.floor(absDays / 7), 'week')
  if (absDays < 365) return rtfAlways.format(sign * Math.floor(absDays / 30), 'month')
  return rtfAlways.format(sign * Math.floor(absDays / 365), 'year')
}
