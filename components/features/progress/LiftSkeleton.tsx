'use client'

import { History, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import { useReducedMotion } from '@/lib/display'

/**
 * The lift page while it loads: the same back link, title, chips, chart
 * folder (tabs, tiles, chart, ranges), Records and Sessions folders as
 * LiftView, at the same heights, with pulsing placeholders for the numbers.
 * Shown by the route's loading.tsx (at once on a tap), its Suspense fallback
 * and LiftView's own loading state (a chip switch). The pulse stops with
 * reduced motion, and E-ink display drops it altogether (still outlined
 * blocks, see [data-lift-skeleton] in globals.css). Readers hear "Loading…"
 * (and LiftView's back link) only.
 */

const PULSE = 'block bg-muted motion-safe:animate-pulse'
const STILL = 'block bg-muted'

export default function LiftSkeleton({ back }: { back?: ReactNode }) {
  const BAR = useReducedMotion() ? STILL : PULSE
  return (
    <div data-lift-skeleton="" aria-busy="true" className="space-y-5">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div>
        {/* LiftView passes its real back link, which works while the lift loads. */}
        {back ?? (
          <div aria-hidden="true" className="flex h-12 items-center">
            <span className={`${BAR} h-4 w-40`} />
          </div>
        )}
        <div aria-hidden="true">
          {/* PageTitle's line: text-4xl */}
          <div className="flex h-10 items-center">
            <span className={`${BAR} h-8 w-2/3`} />
          </div>
          <div className="mt-3 flex gap-1.5 overflow-hidden">
            {['w-40', 'w-32', 'w-28'].map((w) => (
              <span key={w} className={`${BAR} h-12 shrink-0 border-2 border-border ${w}`} />
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden="true">
        <div className="flex h-12 items-end gap-1">
          <span className="h-11 w-20 rounded-tl bg-secondary/60" />
          <span className="h-10 w-24 rounded-tl bg-muted" />
          <span className="h-10 w-24 rounded-tl bg-muted" />
        </div>
        <div className="folder-box border-2 border-secondary bg-card">
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {[0, 1, 2].map((i) => (
              // A tile's lines: label (text-xs), value (text-2xl leading-tight), detail (text-xs).
              <div key={i} className="min-w-0 px-3 py-2.5">
                <span className="flex h-4 items-center">
                  <span className={`${BAR} h-3 w-14`} />
                </span>
                <span className="flex h-[30px] items-center">
                  <span className={`${BAR} h-6 w-12`} />
                </span>
                <span className="flex h-4 items-center">
                  <span className={`${BAR} h-3 w-16`} />
                </span>
              </div>
            ))}
          </div>
          <div className="p-3">
            {/* LineChart's viewBox, plus the legend line */}
            <span className={`${BAR} aspect-[320/150] w-full`} />
            <span className={`${BAR} mt-1 h-4 w-48`} />
          </div>
          <div className="flex border-t border-border">
            {['3M', '6M', '1Y', 'All'].map((r) => (
              <span
                key={r}
                className="flex h-12 flex-1 items-center justify-center text-sm font-bold uppercase tracking-wider text-muted-foreground/50"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden="true">
        <div className="flex items-end">
          <PaperTabTitle tone="coach" icon={<Trophy size={16} />} as="span">
            Records
          </PaperTabTitle>
        </div>
        <div className="folder-box border-2 border-accent bg-card divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex min-h-12 items-center gap-3 px-3 py-2">
              <span className={`${BAR} h-3 w-14`} />
              <span className={`${BAR} h-4 w-16 flex-none`} />
              <span className="flex-1" />
              <span className={`${BAR} h-4 w-12`} />
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true">
        <div className="flex items-end">
          <PaperTabTitle tone="mine" icon={<History size={16} />} as="span">
            Sessions
          </PaperTabTitle>
        </div>
        <div className="folder-box border-2 border-secondary bg-card divide-y divide-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="flex h-5 items-center">
                  <span className={`${BAR} h-4 w-24`} />
                </span>
                <span className="flex h-5 items-center">
                  <span className={`${BAR} h-4 w-48`} />
                </span>
              </div>
              <span className={`${BAR} h-8 w-10`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
