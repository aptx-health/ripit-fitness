'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import {
  distinctTags,
  MAX_TAGS_PER_USER,
  MAX_TAGS_PER_WORKOUT,
  normaliseTag,
  STARTER_TAGS,
  TAG_MAX_LENGTH,
} from '@/lib/saved-workouts/tags'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

/** A tag toggle: a 48px chip, filled when on. */
export const TAG_CHIP =
  'doom-focus-ring min-h-12 border-2 px-3 text-sm font-semibold transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground border-border text-foreground hover:bg-muted aria-pressed:hover:bg-primary-hover'

const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

type Props = {
  item: SavedWorkoutListItem
  /** Every saved workout of the user's, archived ones too: their tags are the user's tags. */
  items: SavedWorkoutListItem[]
  /** Called with the chosen tags when the sheet closes (Done, Escape or a tap outside). */
  onClose: (tags: string[]) => void
}

/**
 * The Tags… sheet from a row's panel: the user's tags and the starter tags as
 * chips to toggle, and a box to add a new one. Past a limit an alert says
 * which and nothing changes. The list saves on close (PATCH { tags }); the
 * route checks the same limits.
 */
export default function TagsSheet({ item, items, onClose }: Props) {
  const [chosen, setChosen] = useState<string[]>(item.tags ?? [])
  const [typed, setTyped] = useState('')
  const [limit, setLimit] = useState<string | null>(null)

  const others = distinctTags(items.filter((x) => x.id !== item.id))
  const userTags = distinctTags([{ tags: others }, { tags: item.tags ?? [] }])
  const known = [...userTags, ...STARTER_TAGS]
  // The chips: the user's tags, the starters, then any added here, each once.
  const chips = distinctTags([{ tags: known }, { tags: chosen }])

  /** Turn a tag on, unless that breaks a limit. */
  const turnOn = (tag: string) => {
    if (chosen.some((t) => sameTag(t, tag))) return setLimit(null)
    if (tag.length > TAG_MAX_LENGTH) return setLimit(`A tag can be at most ${TAG_MAX_LENGTH} characters.`)
    if (chosen.length >= MAX_TAGS_PER_WORKOUT) return setLimit(`A workout can have at most ${MAX_TAGS_PER_WORKOUT} tags.`)
    if (distinctTags([{ tags: others }, { tags: [...chosen, tag] }]).length > MAX_TAGS_PER_USER)
      return setLimit(`You can have at most ${MAX_TAGS_PER_USER} tags in all.`)
    setLimit(null)
    setChosen([...chosen, tag])
  }

  const toggle = (tag: string) => {
    if (chosen.some((t) => sameTag(t, tag))) {
      setLimit(null)
      setChosen(chosen.filter((t) => !sameTag(t, tag)))
    } else turnOn(tag)
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const tag = normaliseTag(typed, [...known, ...chosen])
    if (!tag) return
    turnOn(tag)
    setTyped('')
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose(chosen)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="bg-background/70 backdrop-blur-md"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        />
        {/* A bottom sheet on a phone; inline styles so a transformed parent can't move it. */}
        <Dialog.Content
          className="doom-corners max-h-[85vh] w-full max-w-md overflow-y-auto border-2 border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
          style={{ position: 'fixed', left: '50%', bottom: 0, transform: 'translateX(-50%)', zIndex: 51 }}
        >
          <Dialog.Title className="mb-1 text-lg font-bold uppercase tracking-wider text-foreground">
            Tags for {item.name}
          </Dialog.Title>
          <Dialog.Description className="mb-3 text-sm text-muted-foreground">
            Tap to add or remove. Up to {MAX_TAGS_PER_WORKOUT} per workout.
          </Dialog.Description>

          <div className="flex flex-wrap gap-2">
            {chips.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={chosen.some((t) => sameTag(t, tag))}
                onClick={() => toggle(tag)}
                className={TAG_CHIP}
              >
                {tag}
              </button>
            ))}
          </div>

          <form onSubmit={add} className="mt-4 flex gap-2">
            <label htmlFor={`new-tag-${item.id}`} className="sr-only">
              New tag
            </label>
            <input
              id={`new-tag-${item.id}`}
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

          {limit && (
            <p role="alert" className="mt-3 border-2 border-error bg-error/10 p-3 text-sm text-error">
              {limit}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="doom-focus-ring min-h-12 bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary-hover"
              >
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
