'use client'

import { Lock, Plus } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Create-new affordance primitive.
 *
 * Renders the solid-2px-sandy-border + "+" icon + uppercase-label treatment
 * reserved for empty containers that invite the user to add something
 * (a new program, a new exercise, a new set). This is the *visually
 * distinct sibling* of <TipAnnotation>:
 *
 *   - <TipAnnotation>: 1px dashed border → "field-guide tip"
 *   - <CreateNewCard>: 2px solid border  → "empty frame, add something here"
 *
 * The two patterns must remain visually distinct. If a new pattern needs
 * an "empty frame" treatment, propose a third primitive — don't reuse either.
 * See DESIGN.md §5 Components — Dashed vs Solid.
 */

interface CreateNewCardProps {
  label: string
  /** Custom icon. Defaults to <Plus size={16} /> (or <Lock> when locked). */
  icon?: ReactNode
  /** Anchor mode — renders as a <Link>. Pass either href OR onClick, not both. */
  href?: string
  /** Button mode — renders as a <button>. Pass either onClick OR href. */
  onClick?: () => void
  disabled?: boolean
  /**
   * Locked variant — shows a Lock icon, applies cursor-not-allowed/opacity,
   * and renders as a button (typically wired to a premium-gate handler).
   */
  locked?: boolean
  /** Extra className merged into the element. */
  className?: string
  /** Accessible label override for icon-only contexts. Defaults to `label`. */
  'aria-label'?: string
}

export function CreateNewCard({
  label,
  icon,
  href,
  onClick,
  disabled = false,
  locked = false,
  className = '',
  'aria-label': ariaLabel,
}: CreateNewCardProps) {
  const baseClass =
    'flex items-center justify-center gap-2 w-full py-3 border-2 border-border bg-transparent text-muted-foreground transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring'

  const interactiveClass = locked
    ? 'hover:text-muted-foreground/80 cursor-not-allowed opacity-70'
    : 'hover:bg-muted/40 hover:border-primary hover:text-foreground'

  const combinedClass = [baseClass, interactiveClass, className]
    .filter(Boolean)
    .join(' ')

  const iconNode = icon ?? (locked ? <Lock size={16} /> : <Plus size={16} />)

  // Anchor mode — only when an href is given and the card isn't locked/disabled.
  if (href && !locked && !disabled) {
    return (
      <Link href={href} className={combinedClass} aria-label={ariaLabel ?? label}>
        {iconNode}
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={combinedClass}
      aria-label={ariaLabel ?? label}
    >
      {iconNode}
      {label}
    </button>
  )
}
