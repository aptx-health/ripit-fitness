'use client'

import * as Popover from '@radix-ui/react-popover'
import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { pluralize } from '@/lib/format/pluralize'
import { formatSavedWorkoutDate } from '@/lib/format/savedWorkoutDate'
import PinToggle from './PinToggle'

export type SavedWorkoutListItem = {
  id: string
  name: string
  notes?: string | null
  exerciseCount: number
  lastUsedAt: string | null
  createdAt: string
  pinnedAt?: string | null
}

type Props = {
  item: SavedWorkoutListItem
  onOpen: () => void
  onTogglePin: () => void
  onRename: () => void
  onDelete: () => void
}

export default function SavedWorkoutRow({ item, onOpen, onTogglePin, onRename, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const dateLabel = item.lastUsedAt
    ? formatSavedWorkoutDate(item.lastUsedAt)
    : `Created ${formatSavedWorkoutDate(item.createdAt)}`

  return (
    // A row in the Workouts folder box, like Pinned on Training: the list draws the dividers.
    <div className="flex items-center pr-1">
      <button
        type="button"
        onClick={onOpen}
        className="doom-focus-ring flex min-h-12 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
        aria-label={`View ${item.name}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-foreground">{item.name}</span>
            {item.pinnedAt && (
              // Brown, the colour of the Pinned Workouts tab on Training.
              <span className="shrink-0 bg-secondary px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-secondary-foreground">
                Pinned
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {pluralize(item.exerciseCount, 'exercise')} &middot; {dateLabel}
          </div>
        </div>
      </button>

      <PinToggle name={item.name} pinned={Boolean(item.pinnedAt)} onToggle={onTogglePin} />

      <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="doom-focus-ring flex min-h-12 min-w-12 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Actions for ${item.name}`}
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={4}
            className="z-[100] min-w-[160px] border-2 border-border bg-card shadow-xl"
          >
            <div className="flex flex-col py-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onRename()
                }}
                className="doom-focus-ring px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="doom-focus-ring px-4 py-3 text-left text-sm text-error hover:bg-error/10"
              >
                Delete
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
