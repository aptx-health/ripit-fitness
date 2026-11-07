'use client'

import { Play } from 'lucide-react'
import { pluralize } from '@/lib/format/pluralize'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

type Props = {
  item: SavedWorkoutListItem
  starting: boolean
  onOpen: () => void
  onStart: () => void
  onDismiss: () => void
}

/** Who sent it: the coach's or the agent's name. */
function sourceLabel(item: SavedWorkoutListItem) {
  if (item.origin === 'coach' || item.fromCoach) return `From ${item.coachName ?? 'your coach'}`
  return `From ${item.source ?? 'your agent'}`
}

/** A row in the New group: an AI or coach workout waiting to be started or dismissed. */
export default function NewWorkoutRow({ item, starting, onOpen, onStart, onDismiss }: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={onOpen}
        className="doom-focus-ring flex min-h-12 w-full min-w-0 flex-col px-4 pt-3 pb-1 text-left hover:bg-muted/50"
        aria-label={`View ${item.name}`}
      >
        <span className="w-full truncate font-bold text-foreground">{item.name}</span>
        <span className="mt-0.5 w-full truncate text-sm text-muted-foreground">
          {sourceLabel(item)} &middot; {pluralize(item.exerciseCount, 'exercise')}
        </span>
      </button>
      <div className="flex gap-2 px-4 pt-1 pb-3">
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          aria-label={`Start ${item.name}`}
          className="doom-focus-ring flex min-h-12 flex-1 items-center justify-center gap-2 bg-primary px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={16} aria-hidden="true" />
          {starting ? 'Starting...' : 'Start'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${item.name}`}
          className="doom-focus-ring flex min-h-12 items-center justify-center border border-border px-4 text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-muted"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
