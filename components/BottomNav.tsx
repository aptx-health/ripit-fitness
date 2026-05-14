'use client'

import { Activity, BookOpen, Dumbbell, LayoutGrid, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import QuickActionSheet from '@/components/QuickActionSheet'
import { useDraftWorkout } from '@/lib/contexts/DraftWorkoutContext'

const TABS = [
  { id: 'training', label: 'Training', icon: Activity, href: '/training' },
  { id: 'programs', label: 'Programs', icon: LayoutGrid, href: '/programs' },
] as const

const TABS_AFTER = [
  { id: 'learn', label: 'Learn', icon: BookOpen, href: '/learn' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const { activeDraft } = useDraftWorkout()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-border bg-muted/95 backdrop-blur-sm"
        style={{
          zIndex: 40,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)',
        }}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch h-14">
          {TABS.map((tab) => (
            <NavLink key={tab.id} tab={tab} pathname={pathname} />
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-1 flex items-center justify-center doom-focus-ring"
            aria-label={
              activeDraft
                ? `Resume draft workout: ${activeDraft.workoutName}`
                : 'Quick actions'
            }
          >
            <span className="relative inline-flex items-center justify-center w-16 h-[3.25rem] -translate-y-1">
              {activeDraft && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md pointer-events-none"
                  style={{ animation: 'doom-pulse 2s ease-in-out infinite' }}
                />
              )}
              <span
                className="relative inline-flex flex-col items-center justify-center w-full h-full rounded-md bg-warning text-warning-foreground transition-transform active:translate-y-[3px]"
                style={{
                  boxShadow:
                    '0 5px 0 var(--accent-hover, #B36F08), 0 7px 10px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
              >
                <Dumbbell
                  className="h-5 w-5 -translate-y-[1px]"
                  strokeWidth={2.75}
                />
                <span className="text-[9px] font-black uppercase tracking-[0.1em] leading-none mt-0.5">
                  Workout
                </span>
              </span>
            </span>
            <span className="sr-only">Quick actions</span>
          </button>
          {TABS_AFTER.map((tab) => (
            <NavLink key={tab.id} tab={tab} pathname={pathname} />
          ))}
        </div>
      </nav>
      <QuickActionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}

type Tab = { id: string; label: string; icon: typeof Activity; href: string }

function NavLink({ tab, pathname }: { tab: Tab; pathname: string }) {
  const { id, label, icon: Icon, href } = tab
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
}
