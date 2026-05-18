'use client'

import { Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { useThemeMode } from '@/hooks/useThemeMode'

/**
 * Field-guide tip annotation primitive.
 *
 * Renders the dashed-sandy-border + flex-icon-row treatment reserved for
 * small inline notes the user can read past. This is the canonical
 * dashed-border styling — solid-bordered "create-new" affordances use
 * <CreateNewCard> instead (see DESIGN.md §5 Components — Dashed vs Solid).
 *
 * IMPORTANT: per The Adult-Newcomer Rule (DESIGN.md §1), the frog mascot
 * only appears in the `variant="first-run"` rendering. Do NOT propagate
 * the frog into the default variant or any other "tip" surface — it
 * belongs only on empty-state-adjacent, first-time contexts.
 */

interface TipAnnotationProps {
  children: ReactNode
  /** Custom icon. Defaults to <Lightbulb size={16} />. Pass `false` to omit the icon column entirely (e.g. when the caller renders its own centered icon inline). Ignored when variant="first-run" (the frog ornament replaces the icon). */
  icon?: ReactNode | false
  /**
   * - `default`: dashed border + icon + content. Use for everyday tips.
   * - `first-run`: adds a TIP sticker overlap, swaps icon for a small inline frog ornament,
   *   and applies the paper-grain overlay. Use only on first-time / empty-state-adjacent contexts.
   */
  variant?: 'default' | 'first-run'
  /**
   * Optional theme-role tint for the dashed border and the default icon.
   * Used to make a tip carry mode identity (e.g. weight vs reps loggers).
   * Ignored when variant="first-run" so the frog/sticker treatment stays canonical.
   */
  tint?: 'primary' | 'secondary'
  /**
   * Optional content rendered as a sibling of the icon+content row inside the wrapper.
   * Used for absolute-positioned interactive elements (e.g. the dismiss button or
   * carousel arrow on <MessageCard>). The wrapper is `position: relative` so children
   * passed here can position themselves freely.
   */
  overlay?: ReactNode
  /** Extra className merged into the wrapper. */
  className?: string
}

export function TipAnnotation({
  children,
  icon,
  variant = 'default',
  tint,
  overlay,
  className = '',
}: TipAnnotationProps) {
  const isFirstRun = variant === 'first-run'
  const activeTint = isFirstRun ? undefined : tint
  const borderClass = activeTint === 'primary'
    ? 'border-primary/40'
    : activeTint === 'secondary'
      ? 'border-secondary/40'
      : 'border-border/40'
  const iconColorClass = activeTint === 'primary'
    ? 'text-primary'
    : activeTint === 'secondary'
      ? 'text-secondary'
      : 'text-muted-foreground'
  const wrapperClass = [
    `relative p-3 border border-dashed ${borderClass} bg-muted/35 flex items-start gap-2.5`,
    isFirstRun ? 'doom-noise' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="note" className={wrapperClass}>
      {isFirstRun && <TipSticker />}
      {isFirstRun ? (
        <StillFrog className="shrink-0 mt-[1px]" />
      ) : icon === false ? null : (
        <span className={`shrink-0 mt-[3px] ${iconColorClass} inline-flex`}>
          {icon ?? <Lightbulb size={16} strokeWidth={1.8} aria-hidden="true" />}
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {overlay}
    </div>
  )
}

/**
 * The "TIP" stamp sticker that overlaps the top-left of the dashed border on
 * the first-run variant. Same parallelogram-clip shape language as <doom-badge>.
 */
function TipSticker() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2 left-2 px-2 py-[2px] bg-primary text-primary-foreground font-bold leading-none z-10"
      style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        // Same parallelogram chamfer as .doom-badge in app/globals.css
        clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
      }}
    >
      Tip
    </span>
  )
}

/**
 * A still (non-animated) frog ornament. Uses the first frame of the
 * 5-frame squat sprite by clipping the backgroundSize. Mirrors the
 * light/dark sprite selection logic in <LoadingFrog>.
 */
function StillFrog({ className = '' }: { className?: string }) {
  const mode = useThemeMode()
  const spriteUrl =
    mode === 'light' ? '/green-frog-squat-1-light.png' : '/green-frog-squat-1.png'

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width: '28px',
        height: '28px',
        backgroundImage: `url(${spriteUrl})`,
        // Sprite is 5 frames horizontally; show only the first.
        backgroundSize: '140px 28px',
        backgroundPosition: '0 0',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
