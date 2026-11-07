/**
 * Consecutive exercises with the same superset label, in order, for outlines
 * that show a superset as one block. Ungrouped exercises are runs of one with
 * a null group. Each entry keeps its index in the full list.
 */
export function supersetRuns<T>(items: T[], groupOf: (item: T) => string | null | undefined) {
  const runs: Array<{ group: string | null; entries: Array<{ item: T; index: number }> }> = []
  items.forEach((item, index) => {
    const group = groupOf(item) || null
    const last = runs.at(-1)
    if (group && last?.group === group) last.entries.push({ item, index })
    else runs.push({ group, entries: [{ item, index }] })
  })
  return runs
}
