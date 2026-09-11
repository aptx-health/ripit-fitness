'use client'

import { ChevronRight, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  findNavItemForPath,
  groupTier2Items,
  TIER1_ITEMS,
  TIER3_ITEMS,
  type WorkbenchCounts,
} from '@/lib/admin/navigation'

function formatCount(n: number | undefined) {
  if (n === undefined) return null
  return n > 999 ? `${Math.floor(n / 1000)}k` : String(n)
}

export default function AdminSidebar({ counts }: { counts: WorkbenchCounts }) {
  const pathname = usePathname()
  const activeItem = findNavItemForPath(pathname)

  const row = (item: (typeof TIER1_ITEMS)[number]) => {
    const isActive = activeItem?.key === item.key
    const count = item.countKey ? counts[item.countKey] : undefined
    const Icon = item.icon
    return (
      <Link
        key={item.key}
        href={item.href}
        className={`flex items-center gap-2.5 h-[38px] px-3 border-l-[3px] transition-colors ${
          isActive
            ? 'bg-primary-muted border-primary text-success-text'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <Icon size={16} className="shrink-0" />
        <span className="flex-1 min-w-0 truncate text-sm font-semibold uppercase tracking-wide">
          {item.label}
        </span>
        {item.devChip && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold border border-border text-muted-foreground">
            DEV
          </span>
        )}
        {count !== undefined && (
          <span
            className={`shrink-0 text-xs font-bold tabular-nums px-1.5 py-0.5 ${
              item.key === 'feedback' && count > 0
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {formatCount(count)}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-[264px] shrink-0 h-screen sticky top-0 bg-card border-r-2 border-border overflow-y-auto">
      {/* Brand block */}
      <div className="h-[68px] shrink-0 flex flex-col justify-center px-4 border-b-[3px] border-accent">
        <span className="text-lg font-bold uppercase tracking-wider text-foreground leading-tight">Workbench</span>
        <span className="text-xs text-muted-foreground leading-tight">ripit.fit</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="flex items-center h-[38px] px-2.5 gap-2 border-2 border-border bg-background text-muted-foreground">
          <span className="text-sm">Search everything&hellip;</span>
          <span className="ml-auto shrink-0 px-1.5 py-0.5 text-[10px] font-bold border border-border">
            /
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-4">
        <div className="space-y-0.5">{TIER1_ITEMS.map(row)}</div>

        {groupTier2Items().map(({ group, items }) => (
          <div key={group}>
            <div className="px-3 pb-1 doom-label text-secondary">{group}</div>
            <div className="space-y-0.5">{items.map(row)}</div>
          </div>
        ))}

        <div>
          <div className="px-3 pb-1 doom-label text-secondary">Insight &amp; System</div>
          <div className="space-y-0.5">{TIER3_ITEMS.map(row)}</div>
        </div>
      </nav>

      {/* Footer */}
      <Link
        href="/settings"
        className="flex items-center gap-2 h-[56px] px-4 shrink-0 border-t-2 border-border text-muted-foreground hover:text-foreground"
      >
        <LogOut size={16} />
        <span className="text-sm font-semibold uppercase tracking-wide">Exit to app</span>
        <ChevronRight size={14} className="ml-auto" />
      </Link>
    </aside>
  )
}
