import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Play,
  SkipForward,
} from 'lucide-react'
import Link from 'next/link'

/**
 * Reference mockup for the Training page end-state.
 *
 * This is a static, hardcoded snapshot intended for spike #721 and the
 * Styling Sweep milestone (#10). It shows the canonical visual treatment
 * the tickets should converge on: bracketed list, doom-title, week
 * navigator, field-guide tip, and the four workout row states (pending +
 * expanded, draft / continue, completed, skipped) on one screen.
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
          <span className="inline-block px-3 py-0.5 bg-primary text-primary-foreground text-sm sm:text-base font-bold uppercase tracking-wider mt-1">
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

function WeekDescription() {
  return (
    <p className="text-base text-muted-foreground leading-relaxed px-1">
      The hardest week of the program. The last few reps of each set should feel
      genuinely difficult.
    </p>
  )
}

/**
 * Canonical "field-guide tip" treatment. Dashed border, subtle muted bg,
 * lightbulb glyph, small uppercase TIP label, calm body copy. This pattern
 * is reserved for contextual help. It must NOT be confused with the
 * "create new" dashed-border pattern used elsewhere (see ticket #717).
 */
function FieldGuideTip() {
  return (
    <div
      role="note"
      className="p-3.5 border border-dashed border-border/40 bg-muted/35 flex items-start gap-2.5"
    >
      <Lightbulb
        aria-hidden="true"
        size={18}
        strokeWidth={1.8}
        className="shrink-0 mt-[3px] text-muted-foreground"
      />
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
          TIP
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tap any workout below to see what is inside. Skip a day if life gets
          in the way; you can always come back to it later.
        </p>
      </div>
    </div>
  )
}

function WorkoutList() {
  return (
    <div className="bg-card border border-border doom-corners divide-y divide-border">
      <CompletedWorkoutRow
        day={1}
        name="Lower Body A"
        exerciseCount={6}
        completedAt="May 12"
      />
      <DraftWorkoutRow
        day={2}
        name="Upper Body A"
        exerciseCount={5}
        startedAt="2h ago"
      />
      <PendingWorkoutRow day={3} name="Lower Body B" exerciseCount={6} expanded />
      <SkippedWorkoutRow day={4} name="Upper Body B" exerciseCount={5} />
      <CompleteWeekButton />
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
    <div className="border-l-4 border-l-success bg-success/5 px-4 py-3 cursor-default">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground doom-heading truncate">
            DAY {day}: {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="tabular-nums">{exerciseCount} exercises</span>
            <span className="text-xs">{completedAt}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="doom-badge doom-badge-completed">
            <Check size={12} />
          </span>
          <ChevronRight size={18} className="text-muted-foreground" />
        </div>
      </div>
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
      className="w-full text-left border-l-4 border-l-primary bg-primary/5 px-4 py-3 hover:bg-primary/10 active:bg-primary/15 transition-colors doom-focus-ring"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground doom-heading truncate">
            DAY {day}: {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="tabular-nums">{exerciseCount} exercises</span>
            <span className="text-xs">Started {startedAt}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="doom-badge doom-badge-accent text-xs">CONTINUE</span>
          <ChevronRight size={18} className="text-muted-foreground" />
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
        className="w-full text-left border-l-4 border-l-border bg-card px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors doom-focus-ring"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground doom-heading truncate">
              DAY {day}: {name.toUpperCase()}
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">{exerciseCount} exercises</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="p-1 text-muted-foreground">
              {expanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm transition-colors doom-focus-ring"
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground font-semibold uppercase tracking-wider text-sm transition-colors doom-focus-ring"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)',
            }}
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
      className="w-full text-left border-l-4 border-l-muted-foreground bg-muted/30 opacity-75 px-4 py-3 hover:bg-muted/50 transition-colors doom-focus-ring"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground doom-heading truncate line-through opacity-60">
            DAY {day}: {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="tabular-nums">{exerciseCount} exercises</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            SKIPPED
          </span>
          <ChevronRight size={18} className="text-muted-foreground" />
        </div>
      </div>
    </button>
  )
}

function CompleteWeekButton() {
  return (
    <button
      type="button"
      className="w-full py-3.5 text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 active:bg-muted/60 transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring"
    >
      <div className="flex items-center justify-center gap-2">
        <CheckCircle size={16} />
        Complete Week
      </div>
    </button>
  )
}
