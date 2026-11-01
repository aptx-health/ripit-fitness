'use client'

import { Pin } from 'lucide-react'

type Props = {
  name: string
  pinned: boolean
  onToggle: () => void
  className?: string
}

/** Pin or unpin a saved workout, so it shows (or stops showing) on Training. */
export default function PinToggle({ name, pinned, onToggle, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={pinned}
      aria-label={`${pinned ? 'Unpin' : 'Pin'} ${name}`}
      title={pinned ? 'Unpin from Training' : 'Pin to Training'}
      className={`doom-focus-ring flex min-h-12 min-w-12 items-center justify-center ${
        pinned ? 'text-primary' : 'text-muted-foreground'
      } hover:bg-muted hover:text-foreground ${className}`}
    >
      {/* Filled when pinned: the icon shows the state, the label names the action. */}
      <Pin className="h-5 w-5" fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}
