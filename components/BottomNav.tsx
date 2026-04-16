'use client'

import { Activity, BookOpen, LayoutGrid, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { id: 'training', label: 'Training', icon: Activity, href: '/training' },
  { id: 'programs', label: 'Programs', icon: LayoutGrid, href: '/programs' },
  { id: 'learn', label: 'Learn', icon: BookOpen, href: '/learn' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-border bg-muted/95 backdrop-blur-sm"
      style={{
        zIndex: 40,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)',
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ id, label, icon: Icon, href }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={id}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-12 min-w-12 transition-colors ${
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
