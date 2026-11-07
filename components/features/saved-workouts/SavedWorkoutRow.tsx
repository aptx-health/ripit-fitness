'use client'

import { Archive, ChevronDown, ChevronRight, Eye, Pencil, Pin, Play, Trash2, X } from 'lucide-react'
import SendToTrainee, { type Trainee } from '@/components/coaching/SendToTrainee'
import { panelButton, ROW_PANEL, ROW_PANEL_BUTTONS } from '@/components/ui/rowPanel'
import { pluralize } from '@/lib/format/pluralize'
import { formatSavedWorkoutDate } from '@/lib/format/savedWorkoutDate'

export type SavedWorkoutListItem = {
  id: string
  name: string
  notes?: string | null
  exerciseCount: number
  lastUsedAt: string | null
  createdAt: string
  pinnedAt?: string | null
  /** session | agent | coach */
  origin?: string
  archivedAt?: string | null
  dismissedAt?: string | null
  /** Who sent an unstarted agent workout (the agent's name), for the New group. */
  source?: string | null
  /** A coach's proposal created it (coaching slice 2), so New says "From your coach". */
  fromCoach?: boolean
  /** The coach's name, as Coaching shows it, for "From Dustin". */
  coachName?: string | null
}

type Props = {
  item: SavedWorkoutListItem
  /** In the New group: the summary says who sent it, and the panel has Dismiss. */
  isNew?: boolean
  expanded: boolean
  starting: boolean
  /** The user's trainees (coaching slice 2); with any, the panel has Send. */
  trainees: Trainee[]
  onToggle: () => void
  onOpen: () => void
  onStart: () => void
  onTogglePin: () => void
  onRename: () => void
  onArchive: () => void
  onDismiss?: () => void
  onDelete: () => void
}

/** Who sent a New workout: the coach's or the agent's name. */
function sourceLabel(item: SavedWorkoutListItem) {
  if (item.origin === 'coach' || item.fromCoach) return `From ${item.coachName ?? 'your coach'}`
  return `From ${item.source ?? 'your agent'}`
}

/**
 * A row in the Workouts folder box, like a My Programs row (work 153): name,
 * Pinned label, summary and a chevron; tapping it opens a panel of large
 * buttons under it. The list keeps one row open at a time.
 */
export default function SavedWorkoutRow({
  item,
  isNew = false,
  expanded,
  starting,
  trainees,
  onToggle,
  onOpen,
  onStart,
  onTogglePin,
  onRename,
  onArchive,
  onDismiss,
  onDelete,
}: Props) {
  const pinned = Boolean(item.pinnedAt)
  const dateLabel = item.lastUsedAt
    ? formatSavedWorkoutDate(item.lastUsedAt)
    : `Created ${formatSavedWorkoutDate(item.createdAt)}`
  const summary = isNew
    ? `${sourceLabel(item)} · ${pluralize(item.exerciseCount, 'exercise')}`
    : `${pluralize(item.exerciseCount, 'exercise')} · ${dateLabel}`
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    // The list draws the dividers.
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="doom-focus-ring flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-foreground">{item.name}</span>
            {pinned && (
              // Brown, the colour of the Pinned Workouts tab on Training.
              <span className="shrink-0 bg-secondary px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-secondary-foreground">
                Pinned
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">{summary}</div>
        </div>
        <Chevron size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </button>

      {expanded && (
        <div className={ROW_PANEL}>
          <div className={ROW_PANEL_BUTTONS}>
            <button type="button" onClick={onOpen} aria-label={`View ${item.name}`} {...panelButton('primary')}>
              <Eye size={14} aria-hidden="true" />
              View
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              aria-label={`Start ${item.name}`}
              {...panelButton()}
            >
              <Play size={14} aria-hidden="true" />
              {starting ? 'Starting...' : 'Start'}
            </button>
            <button
              type="button"
              onClick={onTogglePin}
              aria-pressed={pinned}
              aria-label={`${pinned ? 'Unpin' : 'Pin'} ${item.name}`}
              {...panelButton()}
            >
              {/* Filled when pinned: the icon shows the state, the label names the action. */}
              <Pin size={14} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
              {pinned ? 'Unpin' : 'Pin'}
            </button>
            {isNew && onDismiss && (
              <button type="button" onClick={onDismiss} aria-label={`Dismiss ${item.name}`} {...panelButton()}>
                <X size={14} aria-hidden="true" />
                Dismiss
              </button>
            )}
            <button type="button" onClick={onRename} aria-label={`Rename ${item.name}`} {...panelButton()}>
              <Pencil size={14} aria-hidden="true" />
              Rename
            </button>
            <button type="button" onClick={onArchive} aria-label={`Archive ${item.name}`} {...panelButton()}>
              <Archive size={14} aria-hidden="true" />
              Archive
            </button>
            <button type="button" onClick={onDelete} aria-label={`Delete ${item.name}`} {...panelButton('danger')}>
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
            <SendToTrainee kind="saved_workout" sourceId={item.id} trainees={trainees} button={panelButton()} />
          </div>
        </div>
      )}
    </div>
  )
}
