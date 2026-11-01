import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { PAPER_TAB_CLIP, type PaperTabTone } from '@/components/ui/PaperTabs'

/**
 * A single paper tab carrying a title, for a folder box that has no tab
 * switching: a dialog or sheet title (Quick actions, Workout). With `asChild`,
 * the one child element (e.g. Radix `Dialog.Title`) becomes the title, so the
 * dialog keeps its own labelling; otherwise an <h2> is rendered.
 */

const FILL: Record<PaperTabTone, string> = {
  mine: 'bg-secondary text-secondary-foreground',
  next: 'bg-primary text-primary-foreground',
  coach: 'bg-accent text-accent-foreground',
}

const TITLE = 'inline-flex min-w-0 items-center gap-2 font-bold uppercase tracking-wider'

export default function PaperTabTitle({
  tone,
  icon,
  asChild = false,
  children,
}: {
  tone: PaperTabTone
  icon?: ReactNode
  asChild?: boolean
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
      <h2 className={TITLE}>
        {decoratedIcon}
        {children}
      </h2>
    )
  }

  return (
    <div
      className={`relative z-10 inline-flex min-w-0 items-center pl-3.5 pr-6 pt-2 pb-1.5 rounded-tl ${FILL[tone]}`}
      style={PAPER_TAB_CLIP}
    >
      {title}
    </div>
  )
}
