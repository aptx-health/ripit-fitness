import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { TIER3_ITEMS } from '@/lib/admin/navigation'

export default function Tier3More() {
  return (
    <details className="group border-2 border-border bg-muted">
      <summary className="flex items-center gap-3 h-[46px] px-3 cursor-pointer list-none">
        <span className="flex-1 min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          More
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {TIER3_ITEMS.map((i) => i.label).join(' · ')}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t-2 border-border divide-y divide-border">
        {TIER3_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center gap-3 h-[46px] px-3 bg-card active:bg-muted"
            >
              <Icon size={17} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold uppercase tracking-wide text-foreground">
                {item.label}
              </span>
              {item.devChip && (
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold border border-border text-muted-foreground">
                  DEV
                </span>
              )}
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </div>
    </details>
  )
}
