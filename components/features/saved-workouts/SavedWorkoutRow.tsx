'use client'

import * as Popover from '@radix-ui/react-popover'
import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { pluralize } from '@/lib/format/pluralize'
import { formatSavedWorkoutDate } from '@/lib/format/savedWorkoutDate'

export type SavedWorkoutListItem = {
  id: string
  name: string
  notes?: string | null
  exerciseCount: number
  lastUsedAt: string | null
  createdAt: string
}

type Props = {
  item: SavedWorkoutListItem
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}

export default function SavedWorkoutRow({ item, onOpen, onRename, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const dateLabel = item.lastUsedAt
    ? formatSavedWorkoutDate(item.lastUsedAt)
    : `Created ${formatSavedWorkoutDate(item.createdAt)}`

  return (
    <div className="doom-corners group relative flex items-stretch border-2 border-border bg-card transition-colors hover:border-primary">
      <button
        type="button"
        onClick={onOpen}
        className="doom-focus-ring flex min-h-12 flex-1 items-center gap-3 px-4 py-3 text-left"
        aria-label={`View ${item.name}`}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-foreground">
            {item.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {pluralize(item.exerciseCount, 'exercise')} &middot; {dateLabel}
          </div>
        </div>
      </button>

      <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="doom-focus-ring flex min-h-12 min-w-12 items-center justify-center border-l-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Actions for ${item.name}`}
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={4}
            className="doom-corners z-[100] min-w-[160px] border-2 border-border bg-card shadow-xl"
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
