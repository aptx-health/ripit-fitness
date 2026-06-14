'use client'

import { ChevronDown, ChevronUp, Target } from 'lucide-react'
import { useState } from 'react'
import type { FAUKey } from '@/lib/fau-volume'
import type { MuscleBalanceSnapshot } from './types'

type MuscleBalancePanelProps = {
  snapshot: MuscleBalanceSnapshot
  compact?: boolean
  onSelectFAU?: (fau: FAUKey) => void
}

export default function MuscleBalancePanel({
  snapshot,
  compact = false,
  onSelectFAU,
}: MuscleBalancePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? snapshot.items : snapshot.items.slice(0, compact ? 3 : 5)
  const hasHistory = snapshot.lookback.completedWorkouts > 0

  return (
    <section className="border-2 border-border bg-card p-4 doom-corners">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-foreground">
            <Target size={18} strokeWidth={2.2} aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Muscle Balance
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {snapshot.lookback.completedWorkouts} of {snapshot.lookback.requestedWorkouts} completed workouts
          </p>
        </div>
        <div className="text-right tabular-nums">
          <div className="text-lg font-bold text-foreground">
            {formatSets(snapshot.lookback.totalEffectiveSets)}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Effective sets
          </div>
        </div>
      </div>

      {!hasHistory ? (
        <div className="mt-4 border border-dashed border-border bg-muted/35 p-3 text-sm text-muted-foreground">
          Complete a few strength workouts and this will point at the muscles lagging behind your targets.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleItems.map((item) => {
            const fulfillment = Math.round(item.fulfillment * 100)
            const barWidth = Math.min(100, fulfillment)
            return (
              <button
                key={item.fau}
                type="button"
                onClick={() => onSelectFAU?.(item.fau)}
                disabled={!onSelectFAU}
                className={`block w-full text-left ${onSelectFAU ? 'doom-focus-ring hover:bg-muted/45' : 'cursor-default'} p-1 transition-colors`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                    {item.label}
                  </span>
                  <span className={statusClass(item.status)}>
                    {fulfillment}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full border border-border bg-muted">
                  <div
                    className={item.status === 'neglected' ? 'h-full bg-warning' : 'h-full bg-primary'}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{formatSets(item.actualSets)} sets</span>
                  <span>{Math.round(item.targetShare * 100)}% target share</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {snapshot.items.length > visibleItems.length || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground doom-focus-ring hover:text-primary"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? 'Show less' : 'Show all muscles'}
        </button>
      ) : null}
    </section>
  )
}

function statusClass(status: MuscleBalanceSnapshot['items'][number]['status']) {
  const base = 'text-xs font-bold uppercase tracking-wider tabular-nums'
  if (status === 'neglected') return `${base} text-warning`
  if (status === 'over') return `${base} text-primary`
  return `${base} text-muted-foreground`
}

function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
