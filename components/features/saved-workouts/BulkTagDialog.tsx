'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { pluralize } from '@/lib/format/pluralize'
import { distinctTags, STARTER_TAGS } from '@/lib/saved-workouts/tags'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'
import { TAG_CHIP } from './TagsSheet'

type Props = {
  count: number
  /** Every saved workout of the user's: their tags are the user's tags. */
  items: SavedWorkoutListItem[]
  onPick: (tag: string) => void
  onClose: () => void
}

/**
 * Select mode's Tag: one tap on a tag (the user's, then the starters, each
 * once) or Add with typed text picks it for every selected workout. The list
 * sends it (bulk tag); the route tidies, matches and checks limits.
 */
export default function BulkTagDialog({ count, items, onPick, onClose }: Props) {
  const [typed, setTyped] = useState('')
  const chips = distinctTags([...items, { tags: [...STARTER_TAGS] }])

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (typed.trim()) onPick(typed)
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="bg-background/70 backdrop-blur-md" style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
        <Dialog.Content
          className="doom-corners max-h-[85vh] w-full max-w-md overflow-y-auto border-2 border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
          style={{ position: 'fixed', left: '50%', bottom: 0, transform: 'translateX(-50%)', zIndex: 51 }}
        >
          <Dialog.Title className="mb-1 text-lg font-bold uppercase tracking-wider text-foreground">
            Tag {pluralize(count, 'workout')}
          </Dialog.Title>
          <Dialog.Description className="mb-3 text-sm text-muted-foreground">
            Adds the tag and keeps their others. A workout with 8 tags is skipped.
          </Dialog.Description>

          <div className="flex flex-wrap gap-2">
            {chips.map((tag) => (
              <button key={tag} type="button" onClick={() => onPick(tag)} className={TAG_CHIP}>
                {tag}
              </button>
            ))}
          </div>

          <form onSubmit={add} className="mt-4 flex gap-2">
            <label htmlFor="bulk-new-tag" className="sr-only">
              New tag
            </label>
            <input
              id="bulk-new-tag"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="New tag"
              autoComplete="off"
              className="doom-focus-ring min-h-12 min-w-0 flex-1 border-2 border-border bg-background px-3 text-sm text-foreground focus:border-primary"
            />
            <button
              type="submit"
              className="doom-focus-ring min-h-12 border-2 border-border px-4 text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-muted"
            >
              Add
            </button>
          </form>

          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="doom-focus-ring min-h-12 border-2 border-border px-6 text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
