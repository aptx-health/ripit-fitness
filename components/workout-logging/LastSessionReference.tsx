'use client'

import { History, Sparkles } from 'lucide-react'
import { formatLastSessionSummary, type LastSessionSet } from '@/lib/format/last-session-reference'

interface ExerciseHistoryForReference {
  completedAt: Date | string
  sets: LastSessionSet[]
}

interface LastSessionReferenceProps {
  history: ExerciseHistoryForReference | null
  /** When true, the parent is still fetching history — render nothing to avoid flicker. */
  isLoading?: boolean
}

/**
 * Compact reference line shown above the logger input area: answers
 * "what did I do last time?" without leaving the logger.
 *
 * Three states:
 *   - Has working sets: "Last time: 185 × 5 × 3 @ RPE 8 (3 days ago)"
 *   - No previous logs: "First time logging this — see Info tab for guidance"
 *   - Only warmups previously: "Last logged sets were warmups"
 */
export default function LastSessionReference({
  history,
  isLoading = false,
}: LastSessionReferenceProps) {
  if (isLoading) return null

  const { summary, relative, emptyReason } = formatLastSessionSummary(history)

  if (summary) {
    return (
      <div
        className="flex items-baseline gap-2 px-3 py-2 border-l-4 border-success bg-success/5 text-sm"
        data-testid="last-session-reference"
      >
        <History
          aria-hidden="true"
          size={14}
          className="text-success self-center flex-shrink-0"
        />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Last time:
        </span>
        <span className="font-bold text-foreground">{summary}</span>
        {relative && (
          <span className="text-xs text-muted-foreground ml-auto">({relative})</span>
        )}
      </div>
    )
  }

  if (emptyReason === 'never-logged') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 border-l-4 border-border bg-muted/30 text-sm text-muted-foreground"
        data-testid="last-session-reference-empty"
      >
        <Sparkles aria-hidden="true" size={14} className="flex-shrink-0" />
        <span>First time logging this — see Info tab for guidance</span>
      </div>
    )
  }

  if (emptyReason === 'warmups-only') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 border-l-4 border-border bg-muted/30 text-sm text-muted-foreground"
        data-testid="last-session-reference-warmups"
      >
        <History aria-hidden="true" size={14} className="flex-shrink-0" />
        <span>Last logged sets were warmups</span>
      </div>
    )
  }

  return null
}
