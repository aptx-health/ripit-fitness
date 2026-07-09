import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'

/** Number of primary-FAU chips shown per workout before collapsing to "+N". */
export const MAX_FAU_CHIPS = 4

export type FauChip = { fau: string; label: string; count: number }

/** Minimal logged-set shape needed to derive the history enrichment. */
export type HistoryLoggedSet = {
  isWarmup: boolean
  exercise: { exerciseDefinition: { primaryFAUs: string[] } }
}

/**
 * Roll up primary FAUs across a completion's working (non-warmup) logged sets.
 * Counts sets per primary FAU, returns the top chips by set count with a
 * deterministic tie-break on the FAU token, plus an overflow count for the
 * remainder. Warmups are excluded so the chips reflect real working volume.
 */
export function computeFauRollup(
  loggedSets: HistoryLoggedSet[]
): { chips: FauChip[]; overflow: number } {
  const counts = new Map<string, number>()
  for (const set of loggedSets) {
    if (set.isWarmup) continue
    for (const fau of set.exercise.exerciseDefinition.primaryFAUs) {
      counts.set(fau, (counts.get(fau) ?? 0) + 1)
    }
  }

  const sorted = Array.from(counts.entries())
    .map(([fau, count]) => ({
      fau,
      label: FAU_DISPLAY_NAMES[fau] ?? fau,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.fau.localeCompare(b.fau))

  return {
    chips: sorted.slice(0, MAX_FAU_CHIPS),
    overflow: Math.max(0, sorted.length - MAX_FAU_CHIPS),
  }
}

/**
 * Resolve a session duration in seconds. Prefers the stored `durationSeconds`;
 * falls back to `completedAt − startedAt` when only timestamps exist; returns
 * null when neither is available so the UI can omit it.
 */
export function resolveDurationSeconds(
  durationSeconds: number | null,
  startedAt: Date | null,
  completedAt: Date
): number | null {
  if (durationSeconds != null && durationSeconds > 0) return durationSeconds
  if (startedAt) {
    const diff = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
    if (diff > 0) return diff
  }
  return null
}

/** Count working (non-warmup) sets in a completion. */
export function countWorkingSets(loggedSets: Array<{ isWarmup: boolean }>): number {
  return loggedSets.filter(set => !set.isWarmup).length
}
