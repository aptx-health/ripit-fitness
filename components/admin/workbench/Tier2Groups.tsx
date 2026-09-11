import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { groupTier2Items, type WorkbenchCounts } from '@/lib/admin/navigation'

export default function Tier2Groups({ counts }: { counts: WorkbenchCounts }) {
  return (
    <div className="space-y-5">
      {groupTier2Items().map(({ group, items }) => (
        <div key={group}>
          <div className="doom-label text-secondary mb-1.5">{group}</div>
          <div className="border-2 border-border divide-y divide-border">
            {items.map((item) => {
              const Icon = item.icon
              const count = item.countKey ? counts[item.countKey] : undefined
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-3 h-[46px] px-3 bg-card active:bg-muted"
                >
                  <Icon size={17} className="shrink-0 text-foreground" />
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold uppercase tracking-wide text-foreground">
                    {item.label}
                  </span>
                  {count !== undefined && (
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
