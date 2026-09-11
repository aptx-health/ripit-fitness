import { Dumbbell, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import type { WorkbenchCounts } from '@/lib/admin/navigation'
import { pluralize } from '@/lib/format/pluralize'

export default function Tier1Tiles({ counts }: { counts: WorkbenchCounts }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/admin/exercises"
        className="relative h-24 flex flex-col justify-between p-3 bg-card border-2 border-primary shadow-[0_3px_0_var(--primary-active)]"
      >
        <span className="w-8 h-8 flex items-center justify-center bg-primary-muted text-primary">
          <Dumbbell size={20} />
        </span>
        <div>
          <div className="doom-heading text-sm text-foreground">Exercises</div>
          <div className="text-xs text-muted-foreground">
            {pluralize(counts.exercises, 'definition')}
          </div>
        </div>
      </Link>

      <Link
        href="/admin/feedback"
        className="relative h-24 flex flex-col justify-between p-3 bg-card border-2 border-border"
      >
        {counts.feedbackUnresolved > 0 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
            {counts.feedbackUnresolved} New
          </span>
        )}
        <span className="w-8 h-8 flex items-center justify-center bg-muted text-foreground">
          <MessageSquare size={20} />
        </span>
        <div>
          <div className="doom-heading text-sm text-foreground">Feedback</div>
          <div className="text-xs text-muted-foreground">
            {counts.feedbackUnresolved > 0
              ? `${pluralize(counts.feedbackUnresolved, 'unresolved item')}`
              : 'All caught up'}
          </div>
        </div>
      </Link>
    </div>
  )
}
