'use client'

import { Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { useState } from 'react'
import { formatRelativeTime } from '@/lib/format/relativeTime'
import {
  allTimePRSessionIndex,
  e1rmTrend,
  sessionE1RMs,
  type Trend,
} from '@/lib/stats/exercise-history-derivation'

export interface ExerciseHistoryPanelSet {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup: boolean
}

export interface ExerciseHistoryPanelSession {
  completedAt: Date | string
  workoutName: string
  sets: ExerciseHistoryPanelSet[]
}

interface ExerciseHistoryPanelProps {
  sessions: ExerciseHistoryPanelSession[]
}

function formatWeight(weight: number, unit: string): string {
  if (weight === 0) return 'BW'
  return `${weight} ${unit}`
}

function formatIntensity(set: ExerciseHistoryPanelSet): string | null {
  if (set.rir !== null) return `RIR ${set.rir}`
  if (set.rpe !== null) return `RPE ${set.rpe}`
  return null
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** A single `reps × weight` chip; muted styling for warmups. */
function SetChip({ set, muted = false }: { set: ExerciseHistoryPanelSet; muted?: boolean }) {
  const intensity = formatIntensity(set)
  return (
    <span
      className={`inline-flex items-baseline gap-1 px-2 py-1 text-sm tabular-nums border ${
        muted
          ? 'border-border/40 bg-muted/20 text-muted-foreground'
          : 'border-border/60 bg-muted/40 text-foreground'
      }`}
    >
      <span className="font-bold">
        {set.reps} <span className="text-muted-foreground">×</span> {formatWeight(set.weight, set.weightUnit)}
      </span>
      {intensity && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{intensity}</span>
      )}
    </span>
  )
}

const TREND_META: Record<Trend, { Icon: typeof TrendingUp; className: string; label: string }> = {
  up: { Icon: TrendingUp, className: 'text-success', label: 'Trending up' },
  down: { Icon: TrendingDown, className: 'text-warning', label: 'Trending down' },
  flat: { Icon: Minus, className: 'text-muted-foreground', label: 'Holding steady' },
}

/** Headline: most-recent best-set e1RM with a coarse trend arrow. */
function TrendHeader({
  latestE1RM,
  trend,
}: {
  latestE1RM: number | null
  trend: Trend
}) {
  if (latestE1RM === null) return null
  const { Icon, className, label } = TREND_META[trend]
  return (
    <div className="flex items-center justify-between border border-border border-l-4 border-l-accent bg-card doom-noise px-3 py-2">
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Est. 1RM
        </p>
        <p className="text-xl font-bold text-foreground doom-heading tabular-nums">
          {Math.round(latestE1RM)} <span className="text-sm text-muted-foreground">lbs</span>
        </p>
      </div>
      <Icon aria-label={label} className={`${className} flex-shrink-0`} size={28} strokeWidth={2.5} />
    </div>
  )
}

function SessionCard({
  session,
  e1rm,
  isPR,
}: {
  session: ExerciseHistoryPanelSession
  e1rm: number | null
  isPR: boolean
}) {
  const [showWarmups, setShowWarmups] = useState(false)
  const workingSets = session.sets.filter(s => !s.isWarmup)
  const warmupSets = session.sets.filter(s => s.isWarmup)

  return (
    <div
      className={`border border-border bg-card doom-noise p-3 ${isPR ? 'border-l-4 border-l-success' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground doom-heading">
            {formatDate(session.completedAt)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session.workoutName} · {formatRelativeTime(session.completedAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isPR && (
            <span className="doom-badge doom-badge-completed">
              <Trophy aria-hidden="true" size={12} strokeWidth={2.5} />
              PR
            </span>
          )}
          {e1rm !== null && (
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider tabular-nums">
              e1RM {Math.round(e1rm)}
            </span>
          )}
        </div>
      </div>

      {workingSets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {workingSets.map(set => (
            <SetChip key={set.setNumber} set={set} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Warmups only</p>
      )}

      {warmupSets.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowWarmups(v => !v)}
            aria-expanded={showWarmups}
            className="relative text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground doom-focus-ring before:absolute before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-11 before:content-['']"
          >
            {showWarmups ? 'Hide' : 'Show'} {warmupSets.length} warmup
            {warmupSets.length > 1 ? 's' : ''}
          </button>
          {showWarmups && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {warmupSets.map(set => (
                <SetChip key={set.setNumber} set={set} muted />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Multi-session exercise history for the logger's History tab: recent sessions
 * newest-first with per-session best-set e1RM, a PR badge on the all-time best
 * (of those shown), and a coarse e1RM trend arrow. Warmups collapse behind a
 * toggle. DOOM theme tokens; mobile-first at 375px.
 */
export default function ExerciseHistoryPanel({ sessions }: ExerciseHistoryPanelProps) {
  const e1rms = sessionE1RMs(sessions)
  const qualifyingCount = e1rms.filter(v => v !== null).length
  const prIndex = allTimePRSessionIndex(sessions)
  const trend = e1rmTrend(sessions)
  const latestE1RM = e1rms.find(v => v !== null) ?? null

  // Only flag a PR once there's a prior session to have beaten — a lone first
  // session isn't a "record".
  const showPR = qualifyingCount >= 2

  return (
    <div className="space-y-4 pb-4">
      <TrendHeader latestE1RM={latestE1RM} trend={trend} />
      <div className="space-y-3">
        {sessions.map((session, i) => (
          <SessionCard
            // completedAt + index is stable within a fetched list
            key={`${new Date(session.completedAt).toISOString()}-${i}`}
            session={session}
            e1rm={e1rms[i]}
            isPR={showPR && i === prIndex}
          />
        ))}
      </div>
    </div>
  )
}
