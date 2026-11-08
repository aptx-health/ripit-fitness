'use client'

import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export type GroupTone = 'new' | 'pinned' | 'recent' | 'older'

/**
 * Each group's colour, from the theme's tokens: New the accent, Pinned brown
 * like the Pinned label and Training's Pinned Workouts tab, Recent the primary,
 * Older muted. The square is a fill with its own foreground; the name is
 * coloured text (E-INK turns coloured text black); the line is a 2px fill.
 */
const TONE: Record<GroupTone, { square: string; name: string; line: string }> = {
  new: { square: 'bg-accent text-accent-foreground', name: 'text-accent', line: 'bg-accent' },
  pinned: { square: 'bg-secondary text-secondary-foreground', name: 'text-secondary', line: 'bg-secondary' },
  recent: { square: 'bg-primary text-primary-foreground', name: 'text-primary', line: 'bg-primary' },
  older: { square: 'bg-muted text-foreground', name: 'text-muted-foreground', line: 'bg-border' },
}

const SQUARE = 'flex h-6 min-w-6 shrink-0 items-center justify-center px-1 text-xs font-bold'
const NAME = 'flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-widest'
const LINE = 'h-0.5 min-w-4 flex-1'

/**
 * One Workouts group as a section (work 155, mockup F "Section rule"): a header
 * of the count in a small filled square, the name in the group's colour and a
 * line in that colour to the right edge, then the rows in their own bordered
 * box. No tab shape, so it can't be taken for the Workouts/Programs folder
 * tabs. With `fold`, the whole header is the 48px button that opens and closes
 * the box (Older), which isn't drawn until opened.
 */
export default function GroupBox({
  label,
  tone,
  count,
  children,
  fold,
}: {
  label: string
  tone: GroupTone
  count: number
  children?: ReactNode
  fold?: { open: boolean; onToggle: () => void; controls: string }
}) {
  const colours = TONE[tone]
  // "Pinned (1)" to a screen reader; the count shows in the square.
  const name = `${label} (${count})`
  const rule = (
    <>
      <span className={`${SQUARE} ${colours.square}`}>{count}</span>
      <span className={`${NAME} ${colours.name}`}>
        {label}
        {fold && (
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform ${fold.open ? 'rotate-180' : ''}`}
          />
        )}
      </span>
      <span aria-hidden="true" className={`${LINE} ${colours.line}`} />
    </>
  )

  return (
    <section aria-label={label}>
      {fold ? (
        <button
          type="button"
          aria-label={name}
          aria-expanded={fold.open}
          aria-controls={fold.controls}
          onClick={fold.onToggle}
          className="doom-focus-ring flex min-h-12 w-full items-center gap-3 text-left"
        >
          {rule}
        </button>
      ) : (
        <h3 aria-label={name} className="flex min-h-8 items-center gap-3">
          {rule}
        </h3>
      )}
      {(!fold || fold.open) && <div className="mt-2 border-2 border-border bg-card">{children}</div>}
    </section>
  )
}
