/**
 * Library → Workouts groups: Pinned, then Recent, then Older. A workout's
 * activity is when it was last used, or when it was saved if never started,
 * so a just-approved AI workout tops Recent instead of sinking. Computed at
 * read time; nothing is archived or deleted.
 */

export const RECENT_DAYS = 30

type Groupable = { lastUsedAt: string | null; createdAt: string; pinnedAt?: string | null }

export type SavedWorkoutGroups<T> = { pinned: T[]; recent: T[]; older: T[] }

const activity = (item: Groupable) => Date.parse(item.lastUsedAt ?? item.createdAt)

export function groupSavedWorkouts<T extends Groupable>(items: T[], now: Date = new Date()): SavedWorkoutGroups<T> {
  const cutoff = now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000
  const pinned: T[] = []
  const recent: T[] = []
  const older: T[] = []
  for (const item of items) {
    if (item.pinnedAt) pinned.push(item)
    else if (activity(item) >= cutoff) recent.push(item)
    else older.push(item)
  }
  // Newest pin first, as Training lists them; the others last used first.
  pinned.sort((a, b) => Date.parse(b.pinnedAt as string) - Date.parse(a.pinnedAt as string))
  const byActivity = (a: T, b: T) => activity(b) - activity(a)
  recent.sort(byActivity)
  older.sort(byActivity)
  return { pinned, recent, older }
}
