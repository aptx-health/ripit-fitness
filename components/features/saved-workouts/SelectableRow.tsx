'use client'

import { pluralize } from '@/lib/format/pluralize'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

type Props = {
  item: SavedWorkoutListItem
  checked: boolean
  onToggle: () => void
}

/** A row in select mode: tapping anywhere on it ticks its checkbox; it opens nothing. */
export default function SelectableRow({ item, checked, onToggle }: Props) {
  return (
    <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 has-[:checked]:bg-primary/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${item.name}`}
        className="doom-focus-ring h-5 w-5 shrink-0 accent-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-foreground">{item.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {pluralize(item.exerciseCount, 'exercise')}
          {item.tags && item.tags.length > 0 && ` · ${item.tags.join(', ')}`}
        </span>
      </span>
    </label>
  )
}
