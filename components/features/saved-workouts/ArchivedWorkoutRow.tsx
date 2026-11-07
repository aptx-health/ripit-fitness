'use client'

import { pluralize } from '@/lib/format/pluralize'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

type Props = {
  item: SavedWorkoutListItem
  onOpen: () => void
  onRestore: () => void
  onDelete: () => void
}

/** A row under Show archived: Restore puts it back by its date; Delete confirms first. */
export default function ArchivedWorkoutRow({ item, onOpen, onRestore, onDelete }: Props) {
  return (
    <div className="flex items-center pr-1">
      <button
        type="button"
        onClick={onOpen}
        className="doom-focus-ring flex min-h-12 min-w-0 flex-1 flex-col px-4 py-3 text-left hover:bg-muted/50"
        aria-label={`View ${item.name}`}
      >
        <span className="w-full truncate font-bold text-muted-foreground">{item.name}</span>
        <span className="mt-0.5 w-full truncate text-sm text-muted-foreground">
          {pluralize(item.exerciseCount, 'exercise')}
        </span>
      </button>
      <button
        type="button"
        onClick={onRestore}
        aria-label={`Restore ${item.name}`}
        className="doom-focus-ring flex min-h-12 items-center px-3 text-sm font-bold uppercase tracking-wider text-foreground hover:bg-muted"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${item.name}`}
        className="doom-focus-ring flex min-h-12 items-center px-3 text-sm font-bold uppercase tracking-wider text-error hover:bg-error/10"
      >
        Delete
      </button>
    </div>
  )
}
