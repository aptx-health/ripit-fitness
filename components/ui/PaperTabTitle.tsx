import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { PAPER_TAB_CLIP, type PaperTabTone } from '@/components/ui/PaperTabs'

/**
 * A single paper tab carrying a title, for a folder box that has no tab
 * switching: a dialog or sheet title (Quick actions, Workout). With `asChild`,
 * the one child element (e.g. Radix `Dialog.Title`) becomes the title, so the
 * dialog keeps its own labelling; otherwise an <h2> is rendered, or a <span>
 * (`as="span"`) when something else on the page is the heading.
 */

/** The paper-tab tones, plus `quiet`: the tan tab of a reference section (Recent history). */
export type PaperTabTitleTone = PaperTabTone | 'quiet'

const FILL: Record<PaperTabTitleTone, string> = {
  mine: 'bg-secondary text-secondary-foreground',
  next: 'bg-primary text-primary-foreground',
  coach: 'bg-accent text-accent-foreground',
  quiet: 'bg-muted text-muted-foreground border border-b-0 border-border text-sm',
}

const CHIP: Record<PaperTabTitleTone, string> = {
  mine: 'bg-secondary-foreground text-secondary',
  next: 'bg-primary-foreground text-primary',
  coach: 'bg-accent-foreground text-accent',
  quiet: 'bg-border text-foreground',
}

const TITLE = 'inline-flex min-w-0 items-center gap-2 font-bold uppercase tracking-wider'

export default function PaperTabTitle({
  tone,
  icon,
  asChild = false,
  as: Tag = 'h2',
  count,
  countLabel,
  children,
}: {
  tone: PaperTabTitleTone
  icon?: ReactNode
  asChild?: boolean
  /** The element without `asChild`. */
  as?: 'h2' | 'span'
  /** A count chip after the title, named by `countLabel` (e.g. "6 sessions"). */
  count?: number
  countLabel?: string
  children: ReactNode
}) {
  const decoratedIcon = icon ? (
    <span aria-hidden="true" className="inline-flex shrink-0">
      {icon}
    </span>
  ) : null

  let title: ReactNode
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string; children?: ReactNode }>
    title = cloneElement(child, {
      className: `${TITLE} ${child.props.className ?? ''}`.trim(),
      children: (
        <>
          {decoratedIcon}
          {child.props.children}
        </>
      ),
    })
  } else {
    title = (
      <Tag className={TITLE}>
        {decoratedIcon}
        {children}
      </Tag>
    )
  }

  return (
    <div
      className={`relative z-10 inline-flex min-w-0 items-center gap-2 pl-3.5 pr-6 pt-2 pb-1.5 rounded-tl ${FILL[tone]}`}
      style={PAPER_TAB_CLIP}
    >
      {title}
      {count !== undefined && (
        <span
          role="img"
          aria-label={countLabel}
          className={`px-1.5 text-xs font-bold leading-5 ${CHIP[tone]}`}
        >
          {count}
        </span>
      )}
    </div>
  )
}
