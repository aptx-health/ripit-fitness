import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Play,
  SkipForward,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Reference mockup for the Training page end-state.
 *
 * This is a static, hardcoded snapshot intended for spike #721 and the
 * Styling Sweep milestone (#10). It shows the canonical visual treatment
 * the tickets should converge on: stamped day-number tabs, page-tab
 * section headers, quieter completed rows, mascot-in-tip, and a
 * subtle streak indicator.
 *
 * Reference docs: PRODUCT.md, DESIGN.md, .impeccable/design.json
 * Source of truth lives there. If a ticket disagrees with this page,
 * the spec wins and this page should be updated to match.
 */
export default function TrainingReferencePage() {
  return (
    <div className="bg-background min-h-screen">
      <ReferenceRibbon />

      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <PageTitle />

        <div className="px-4 sm:px-0 space-y-4">
          <WeekNavigatorMock />
          <StreakChip />
          <WeekDescription />
          <FieldGuideTip />
          <WorkoutList />
        </div>
      </div>
    </div>
  )
}

function ReferenceRibbon() {
  return (
    <div className="border-b border-dashed border-primary/40 bg-muted/30 px-4 py-2 flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Reference <span className="text-foreground">• Training Page</span>
      </span>
      <Link
        href="/dev/reference"
        className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline doom-focus-ring"
      >
        Index
      </Link>
    </div>
  )
}

function PageTitle() {
  return (
    <div className="px-4 sm:px-0 mb-4">
      <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
        TRAINING
      </h1>
    </div>
  )
}

function WeekNavigatorMock() {
  return (
    <div>
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-foreground hover:bg-muted/50 active:bg-muted transition-colors doom-focus-ring"
          aria-label="Previous week"
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        <div className="text-center min-w-0 px-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground doom-heading">
            WEEK 2 OF 4
          </h2>
          <span
            className="inline-block px-3 py-0.5 bg-primary text-primary-foreground text-sm sm:text-base font-bold uppercase tracking-wider mt-1"
            style={{
              clipPath:
                'polygon(4px 0%, calc(100% - 4px) 0%, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0% 50%)',
            }}
          >
            MACHINE STARTER
          </span>
        </div>

        <button
          type="button"
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-foreground hover:bg-muted/50 active:bg-muted transition-colors doom-focus-ring"
          aria-label="Next week"
        >
          <ChevronRight size={22} strokeWidth={1.5} />
        </button>
      </div>
      <div className="border-t border-primary/30 mt-3" />
    </div>
  )
}

/**
 * Streak chip: small quirky indicator that ties the warmth of the brand
 * to a real metric. Lives between the week navigator and the workout
 * list, never bigger than the typography rhythm.
 */
function StreakChip() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 bg-warning/10 text-warning border border-warning/30"
        style={{
          clipPath:
            'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
        }}
      >
        <Flame size={12} strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider tabular-nums">
          Streak 3
        </span>
      </div>
    </div>
  )
}

function WeekDescription() {
  return (
    <p className="text-base text-muted-foreground leading-relaxed px-1">
      The hardest week of the program. The last few reps of each set should feel
      genuinely difficult.
    </p>
  )
}

/**
 * Canonical field-guide tip: mascot, calm body copy, dashed border, muted
 * surface. This is reserved for contextual help and must NOT collide with
 * the "create new" dashed-border pattern (see ticket #717). The mascot
 * presence is the visual differentiator.
 */
function FieldGuideTip() {
  return (
    <div
      role="note"
      className="p-3 border border-dashed border-border/40 bg-muted/35 flex items-start gap-3"
    >
      <div className="shrink-0 mt-0.5">
        <Image
          src="/green-frog-squat-1-light.png"
          alt=""
          width={36}
          height={36}
          className="opacity-90"
        />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Tip
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tap any workout below to see what is inside. Skip a day if life gets
          in the way; you can always come back to it later.
        </p>
      </div>
    </div>
  )
}

/**
 * Bracketed card with a "WEEK PLAN" page-tab sitting in the top-left
 * corner, like a section divider in a printed manual. The L-bracket
 * accents (doom-corners) frame the whole card, and rows divide cleanly
 * inside.
 */
function WorkoutList() {
  return (
    <div className="relative pt-3">
      {/* Page-tab — sits half-on / half-off the bracket */}
      <div
        className="absolute -top-px left-3 z-10 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider"
        style={{
          clipPath:
            'polygon(0% 0%, 100% 0%, calc(100% - 6px) 100%, 6px 100%)',
        }}
      >
        Week Plan
      </div>

      <div className="bg-card border border-border doom-corners">
        <SectionLabel>Up next</SectionLabel>
        <PendingWorkoutRow
          day={3}
          name="Lower Body B"
          exerciseCount={6}
          expanded
        />

        <SectionLabel>In progress</SectionLabel>
        <DraftWorkoutRow
          day={2}
          name="Upper Body A"
          exerciseCount={5}
          startedAt="2h ago"
        />

        <SectionLabel>Done</SectionLabel>
        <CompletedWorkoutRow
          day={1}
          name="Lower Body A"
          exerciseCount={6}
          completedAt="May 12"
        />
        <SkippedWorkoutRow day={4} name="Upper Body B" exerciseCount={5} />

        <CompleteWeekButton />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 bg-muted/20 border-t border-border first:border-t-0">
      {children}
    </div>
  )
}

/**
 * Stamped day-number tab. Big tabular number on a clipped-corner surface,
 * status-color-coded by row. Replaces the colored-stripe pattern with
 * something more legible and more characteristic of the field-guide
 * aesthetic.
 */
function DayStamp({
  day,
  variant,
}: {
  day: number
  variant: 'completed' | 'draft' | 'pending' | 'skipped'
}) {
  const styles = {
    completed: 'bg-success/15 text-success border-success/40',
    draft: 'bg-primary/15 text-primary border-primary/40',
    pending: 'bg-muted/60 text-foreground border-border',
    skipped: 'bg-muted/30 text-muted-foreground border-muted-foreground/30',
  }[variant]
  return (
    <div
      className={`shrink-0 w-11 h-11 flex flex-col items-center justify-center border ${styles}`}
      style={{
        clipPath:
          'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
      }}
    >
      <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-70">
        Day
      </span>
      <span className="text-base font-bold tabular-nums leading-tight">
        {String(day).padStart(2, '0')}
      </span>
    </div>
  )
}

function CompletedWorkoutRow({
  day,
  name,
  exerciseCount,
  completedAt,
}: {
  day: number
  name: string
  exerciseCount: number
  completedAt: string
}) {
  return (
    <div className="px-3 py-3 cursor-default">
      <div className="flex items-center gap-3">
        <DayStamp day={day} variant="completed" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground/80 doom-heading truncate">
            {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{exerciseCount} exercises</span>
            <span aria-hidden="true">·</span>
            <span>{completedAt}</span>
          </div>
        </div>
        <div className="shrink-0">
          <SealCheck />
        </div>
      </div>
    </div>
  )
}

function SealCheck() {
  return (
    <div
      role="img"
      aria-label="Completed"
      className="w-8 h-8 flex items-center justify-center bg-success/20 text-success border border-success/40"
      style={{
        clipPath:
          'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
      }}
    >
      <Check size={16} strokeWidth={3} />
    </div>
  )
}

function DraftWorkoutRow({
  day,
  name,
  exerciseCount,
  startedAt,
}: {
  day: number
  name: string
  exerciseCount: number
  startedAt: string
}) {
  return (
    <button
      type="button"
      className="w-full text-left px-3 py-3 hover:bg-primary/5 active:bg-primary/10 transition-colors doom-focus-ring"
    >
      <div className="flex items-center gap-3">
        <DayStamp day={day} variant="draft" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground doom-heading truncate">
            {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{exerciseCount} exercises</span>
            <span aria-hidden="true">·</span>
            <span>Started {startedAt}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="doom-badge doom-badge-accent text-xs">CONTINUE</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </div>
    </button>
  )
}

function PendingWorkoutRow({
  day,
  name,
  exerciseCount,
  expanded = false,
}: {
  day: number
  name: string
  exerciseCount: number
  expanded?: boolean
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        className="w-full text-left px-3 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors doom-focus-ring"
      >
        <div className="flex items-center gap-3">
          <DayStamp day={day} variant="pending" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground doom-heading truncate">
              {name.toUpperCase()}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
              <span>{exerciseCount} exercises</span>
            </div>
          </div>
          <span className="shrink-0 p-1 text-muted-foreground">
            {expanded ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="flex gap-2 px-3 pb-3 pt-1">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm transition-colors doom-focus-ring"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)',
            }}
          >
            <Play size={16} />
            Start Workout
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-sm transition-colors doom-focus-ring"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' }}
          >
            <SkipForward size={14} />
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

function SkippedWorkoutRow({
  day,
  name,
  exerciseCount,
}: {
  day: number
  name: string
  exerciseCount: number
}) {
  return (
    <button
      type="button"
      className="w-full text-left px-3 py-3 opacity-70 hover:opacity-90 hover:bg-muted/30 transition-all doom-focus-ring"
    >
      <div className="flex items-center gap-3">
        <DayStamp day={day} variant="skipped" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-muted-foreground doom-heading truncate line-through">
            {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 tabular-nums">
            <span>{exerciseCount} exercises</span>
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground/80 font-bold uppercase tracking-[0.15em]">
          Skipped
        </span>
      </div>
    </button>
  )
}

function CompleteWeekButton() {
  return (
    <button
      type="button"
      className="w-full py-3 text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 active:bg-muted/60 transition-all text-xs font-bold uppercase tracking-[0.15em] border-t border-border doom-focus-ring"
    >
      <div className="flex items-center justify-center gap-2">
        <CheckCircle size={14} />
        Complete Week
      </div>
    </button>
  )
}
