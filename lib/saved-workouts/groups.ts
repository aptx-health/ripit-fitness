/**
 * Library → Workouts groups: New, then Pinned, then Recent, then Older, plus
 * the archived ones behind Show archived. A workout's activity is when it was
 * last used, or when it was saved if never started, so a just-approved AI
 * workout tops Recent instead of sinking. Computed at read time; nothing is
 * archived or deleted.
 */

export const RECENT_DAYS = 30

type Groupable = {
  lastUsedAt: string | null
  createdAt: string
  pinnedAt?: string | null
  origin?: string
  archivedAt?: string | null
  dismissedAt?: string | null
}

export type SavedWorkoutGroups<T> = { new: T[]; pinned: T[]; recent: T[]; older: T[]; archived: T[] }

const activity = (item: Groupable) => Date.parse(item.lastUsedAt ?? item.createdAt)

/** An AI or coach workout the user hasn't started, dismissed or pinned yet. */
const isNew = (item: Groupable) =>
  (item.origin === 'agent' || item.origin === 'coach') && !item.lastUsedAt && !item.dismissedAt

export function groupSavedWorkouts<T extends Groupable>(items: T[], now: Date = new Date()): SavedWorkoutGroups<T> {
  const cutoff = now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000
  const groups: SavedWorkoutGroups<T> = { new: [], pinned: [], recent: [], older: [], archived: [] }
  for (const item of items) {
    if (item.archivedAt) groups.archived.push(item)
    else if (item.pinnedAt) groups.pinned.push(item)
    else if (isNew(item)) groups.new.push(item)
    else if (activity(item) >= cutoff) groups.recent.push(item)
    else groups.older.push(item)
  }
  // Newest pin first, as Training lists them; New newest saved first; the others last used first.
  groups.pinned.sort((a, b) => Date.parse(b.pinnedAt as string) - Date.parse(a.pinnedAt as string))
  const byActivity = (a: T, b: T) => activity(b) - activity(a)
  groups.new.sort(byActivity)
  groups.recent.sort(byActivity)
  groups.older.sort(byActivity)
  groups.archived.sort((a, b) => Date.parse(b.archivedAt as string) - Date.parse(a.archivedAt as string))
  return groups
}
