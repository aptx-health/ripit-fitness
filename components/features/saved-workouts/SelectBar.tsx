'use client'

import { Archive, Tag, Trash2 } from 'lucide-react'

const BAR_BUTTON =
  'doom-focus-ring flex min-h-12 flex-1 items-center justify-center gap-1.5 border-2 px-3 text-sm font-semibold uppercase tracking-wider transition-colors disabled:opacity-50'

type Props = {
  count: number
  busy: boolean
  onArchive: () => void
  onTag: () => void
  onDelete: () => void
}

/**
 * Select mode's bar (workout library slice 4): fixed at the bottom, above the
 * phone's bottom nav, with the count and the bulk actions. The actions are off
 * while nothing is selected or a request is in flight.
 */
export default function SelectBar({ count, busy, onArchive, onTag, onDelete }: Props) {
  const off = busy || count === 0
  return (
    <div
      role="toolbar"
      aria-label="Selected workouts"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] border-t-2 border-border bg-card/95 backdrop-blur-sm md:bottom-0"
      style={{ zIndex: 41 }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-3 py-2">
        <p className="text-sm font-bold uppercase tracking-wider text-foreground" aria-live="polite">
          {count} selected
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onArchive} disabled={off} className={`${BAR_BUTTON} border-border text-foreground hover:bg-muted`}>
            <Archive size={14} aria-hidden="true" />
            Archive
          </button>
          <button type="button" onClick={onTag} disabled={off} className={`${BAR_BUTTON} border-border text-foreground hover:bg-muted`}>
            <Tag size={14} aria-hidden="true" />
            Tag
          </button>
          <button type="button" onClick={onDelete} disabled={off} className={`${BAR_BUTTON} border-error/50 text-error hover:bg-error/10`}>
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
