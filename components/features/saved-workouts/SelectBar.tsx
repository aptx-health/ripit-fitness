'use client'

import { Archive, Tag, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

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
 * while nothing is selected and while `busy` (the list passes true while a
 * bulk dialog is open or a bulk request is in flight). While the bar shows,
 * --toast-lift raises toasts above it so they never cover the actions.
 */
export default function SelectBar({ count, busy, onArchive, onTag, onDelete }: Props) {
  const off = busy || count === 0
  const bar = useRef<HTMLDivElement>(null)

  // Toasts sit this far up while the bar shows: the gap from the bar's top to the screen's bottom.
  useEffect(() => {
    const root = document.documentElement
    const lift = () => {
      const top = bar.current?.getBoundingClientRect().top ?? window.innerHeight
      root.style.setProperty('--toast-lift', `${Math.max(0, window.innerHeight - top)}px`)
    }
    lift()
    window.addEventListener('resize', lift)
    return () => {
      window.removeEventListener('resize', lift)
      root.style.removeProperty('--toast-lift')
    }
  }, [])

  return (
    <div
      ref={bar}
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
