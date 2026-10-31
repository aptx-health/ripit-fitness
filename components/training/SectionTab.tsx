import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Folder-style section header for the Training home: a tab with an icon, the
 * section's heading (the label alone) and an optional count chip beside it,
 * sitting on the section's box, plus an optional link as a dimmed second tab
 * beside it ("All suggestions"). `coach` and `next` are filled; `quiet` is the tan
 * tab for the reference sections.
 */
export type SectionTabVariant = 'coach' | 'next' | 'quiet'

const TAB: Record<SectionTabVariant, string> = {
  coach: 'bg-accent text-accent-foreground',
  next: 'bg-primary text-primary-foreground',
  quiet: 'bg-muted text-muted-foreground border border-b-0 border-border text-sm',
}

const CHIP: Record<SectionTabVariant, string> = {
  coach: 'bg-accent-foreground text-accent',
  next: 'bg-primary-foreground text-primary',
  quiet: 'bg-border text-foreground',
}

/**
 * Keyboard focus for a paper tab. The clip-path cuts off any ring drawn outside
 * the tab (doom-focus-ring, the themes' *:focus-visible outline), so the ring is
 * drawn inside: a background line, then a foreground line, which shows on every
 * tab fill (gold, green, brown, tan). Important (!) so it beats the unlayered
 * theme rule `[data-theme="ripit"] *:focus-visible`.
 */
export const PAPER_TAB_FOCUS =
  'focus-visible:outline-none! focus-visible:shadow-[inset_0_0_0_2px_var(--background),inset_0_0_0_4px_var(--foreground)]!'

/** The box under each tab: its border matches the tab. */
export const SECTION_BOX: Record<SectionTabVariant, string> = {
  coach: 'border-2 border-accent bg-accent-muted',
  next: 'border-2 border-primary bg-card',
  quiet: 'border border-border bg-card',
}

export default function SectionTab({
  variant,
  id,
  icon,
  label,
  count,
  countLabel,
  action,
}: {
  variant: SectionTabVariant
  /** The heading's id, for the section's aria-labelledby. */
  id: string
  icon: ReactNode
  label: string
  count?: number
  /** Accessible label for the count chip, e.g. "3 suggestions". */
  countLabel?: string
  /** `ariaLabel` names where it goes, e.g. "See all suggestions". */
  action?: { href: string; label: string; ariaLabel?: string }
}) {
  return (
    <div className="flex items-end">
      <div
        className={`relative z-10 inline-flex items-center gap-2 pl-3.5 pr-6 pt-2 pb-1.5 rounded-tl ${TAB[variant]}`}
        style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)' }}
      >
        <h2 id={id} className="inline-flex items-center gap-2 font-bold uppercase tracking-wider">
          <span aria-hidden="true" className="inline-flex">
            {icon}
          </span>
          {label}
        </h2>
        {count !== undefined && (
          // role="img" so the chip can carry its label ("3 suggestions"); the digit alone says too little.
          <span role="img" aria-label={countLabel} className={`px-1.5 text-xs font-bold leading-5 ${CHIP[variant]}`}>
            {count}
          </span>
        )}
      </div>
      {action && (
        // A second paper tab tucked beside the first: dimmed primary, foreground
        // text so it reads in every theme.
        <Link
          href={action.href}
          aria-label={action.ariaLabel}
          className={`-ml-2.5 inline-flex items-center pl-4 pr-5 pt-1.5 pb-1.5 rounded-tl bg-primary/25 text-foreground hover:bg-primary/35 ${PAPER_TAB_FOCUS} text-[13px] font-bold uppercase tracking-wider whitespace-nowrap`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%)' }}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
