import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { PAPER_TAB_CLIP } from '@/components/ui/PaperTabs'

type Props = {
  currentWeek: number
  totalWeeks: number
  baseUrl: string // e.g. '/library/programs/<id>'
  completionIndicator?: React.ReactNode
}

const ARROW = 'shrink-0 flex items-center justify-center w-12 h-12 transition-colors doom-focus-ring'

/**
 * The week's green paper tab: "Week 1 of 2" between the previous and next
 * week arrows. The caller puts the week's folder box right under it.
 */
export default function WeekNavigator({ currentWeek, totalWeeks, baseUrl, completionIndicator }: Props) {
  const hasPrev = currentWeek > 1
  const hasNext = currentWeek < totalWeeks

  return (
    <div className="flex items-end gap-2">
      <div
        className="relative z-10 inline-flex items-center pl-1 pr-6 rounded-tl bg-primary text-primary-foreground"
        style={PAPER_TAB_CLIP}
      >
        <Link
          href={hasPrev ? `${baseUrl}?week=${currentWeek - 1}` : '#'}
          className={`${ARROW} ${hasPrev ? 'hover:bg-primary-foreground/15' : 'opacity-30 pointer-events-none'}`}
          aria-disabled={!hasPrev}
          aria-label="Previous week"
          tabIndex={hasPrev ? 0 : -1}
          onClick={e => !hasPrev && e.preventDefault()}
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>

        <h2 className="px-1 font-bold uppercase tracking-wider whitespace-nowrap">
          Week {currentWeek} of {totalWeeks}
        </h2>

        <Link
          href={hasNext ? `${baseUrl}?week=${currentWeek + 1}` : '#'}
          className={`${ARROW} ${hasNext ? 'hover:bg-primary-foreground/15' : 'opacity-30 pointer-events-none'}`}
          aria-disabled={!hasNext}
          aria-label="Next week"
          tabIndex={hasNext ? 0 : -1}
          onClick={e => !hasNext && e.preventDefault()}
        >
          <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {completionIndicator && <div className="ml-auto shrink-0 pb-1">{completionIndicator}</div>}
    </div>
  )
}
