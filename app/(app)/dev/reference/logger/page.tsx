import {
  Check,
  Delete,
  Lightbulb,
  Minus,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'

/**
 * Reference mockup for the Exercise Logger end-state.
 *
 * Two stacked snapshots of the same exercise: compact-input state
 * (canonical resting form) and weight-keypad-expanded state (drawer
 * pattern with proper CANCEL treatment per ticket #712). Both share
 * the canonical header, tab row, drawer reference banner, history
 * strip, and LOG SET footer.
 *
 * Reference docs: PRODUCT.md, DESIGN.md, .impeccable/design.json
 * Tickets this anchors: #707 (input-stamped), #708 (progress contrast),
 * #710 (bottom-bar geometry), #711 (tap affordance), #712 (cancel),
 * #713 (drawer reference context).
 */

const RAISED_SHADOW =
  'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.15), 0 1px 0 rgba(0,0,0,0.20)'
const RECESSED_SHADOW =
  'inset 0 1px 2px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.05)'

export default function LoggerReferencePage() {
  return (
    <div className="bg-background min-h-screen">
      <ReferenceRibbon />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <Caption
          title="Compact state"
          subtitle="Resting form. REPS stepper inline, WEIGHT and RIR triggers stamped into the surface."
        />
        <LoggerMockup expanded={null} />

        <Caption
          title="Weight drawer expanded"
          subtitle="Numeric keypad drawer with bordered value display, CANCEL muted (not full red), DONE primary."
        />
        <LoggerMockup expanded="weight" />
      </div>
    </div>
  )
}

function ReferenceRibbon() {
  return (
    <div className="border-b border-dashed border-primary/40 bg-muted/30 px-4 py-2 flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Reference <span className="text-foreground">• Exercise Logger</span>
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

function Caption({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-md mx-auto sm:mx-0">
      <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
        {title}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
    </div>
  )
}

function LoggerMockup({ expanded }: { expanded: 'weight' | null }) {
  return (
    <div className="max-w-md mx-auto sm:mx-0 bg-background border border-border doom-corners overflow-hidden">
      <LoggerHeader />
      <TabRow />
      <DrawerContextBanner />
      <FieldGuideTip />
      <LoggedSetList />
      <InputArea expanded={expanded} />
      <LogSetFooter expanded={expanded} />
    </div>
  )
}

/**
 * Header bar: secondary surface, progress dots left, elapsed timer center,
 * actions right. Two-row dot pattern when total exercises > 5 (we show
 * 8 exercises here, so it splits 4 / 4).
 */
function LoggerHeader() {
  return (
    <div
      className="bg-secondary text-secondary-foreground"
      style={{ boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)' }}
    >
      <div
        className="px-4 py-3 grid items-center"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        <ProgressIndicator current={2} total={8} />
        <span
          className="text-lg font-medium text-secondary-foreground tabular-nums text-center"
          style={{ minWidth: '5ch' }}
        >
          18:42
        </span>
        <div className="flex items-center justify-end gap-3.5">
          <button
            type="button"
            className="p-1 text-secondary-foreground/80 hover:text-secondary-foreground doom-focus-ring"
            aria-label="More actions"
          >
            <MoreVertical size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="p-1 text-primary hover:text-primary/80 doom-focus-ring"
            aria-label="Complete workout"
          >
            <Check size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="p-1 text-secondary-foreground/80 hover:text-secondary-foreground doom-focus-ring"
            aria-label="Exit workout"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const useDoubleRow = total > 5
  const topCount = useDoubleRow ? Math.ceil(total / 2) : total
  const bottomCount = useDoubleRow ? total - topCount : 0

  const renderRow = (count: number, startIndex: number) => (
    <div className="flex gap-[3px]" style={{ width: '110px' }}>
      {Array.from({ length: count }, (_, i) => {
        const exerciseIndex = startIndex + i
        const active = exerciseIndex <= current
        return (
          <div
            key={exerciseIndex}
            className="h-[5px] flex-1"
            style={{
              backgroundColor: active ? 'var(--primary)' : 'rgba(0,0,0,0.25)',
              boxShadow: active ? undefined : 'inset 0 1px 0 rgba(0,0,0,0.20)',
            }}
          />
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-[3px]" style={{ width: '110px' }}>
      {renderRow(topCount, 0)}
      {useDoubleRow && renderRow(bottomCount, topCount)}
    </div>
  )
}

/**
 * Tab row: segmented control with active underline. The active tab
 * carries solid background, the rest are flat. Underline-only is the
 * fallback when the tab list outgrows three items (see #714 / #716).
 */
function TabRow() {
  const tabs = [
    { id: 'log', label: 'Log Sets', active: true },
    { id: 'info', label: 'Info', active: false },
    { id: 'history', label: 'History', active: false, dot: true },
  ]
  return (
    <div className="flex bg-muted/40 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`relative flex-1 px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors doom-focus-ring ${
            tab.active
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:bg-muted/60'
          }`}
        >
          <span>{tab.label}</span>
          {tab.dot && (
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary" />
          )}
          {tab.active && (
            <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * Drawer reference banner (ticket #713): tells the user which exercise
 * they are on, which set is next, and what was prescribed. Lives at
 * the top of the LOG SETS tab so the context never disappears when
 * the keypad or RIR picker takes over the input area.
 */
function DrawerContextBanner() {
  return (
    <div className="px-4 pt-3 pb-2 border-b border-border/60">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground doom-heading truncate">
          BARBELL BACK SQUAT
        </h2>
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider tabular-nums shrink-0">
          Set 3 of 4
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
        Prescribed: <span className="text-foreground">5 reps @ 135 lb, RIR 2</span>
      </p>
    </div>
  )
}

function FieldGuideTip() {
  return (
    <div className="px-4 py-3">
      <div
        role="note"
        className="p-3 border border-dashed border-border/40 bg-muted/35 flex items-start gap-2.5"
      >
        <Lightbulb
          aria-hidden="true"
          size={16}
          strokeWidth={1.8}
          className="shrink-0 mt-[3px] text-muted-foreground"
        />
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Set the weight to what you actually lifted, not what was prescribed.
            The number you log is the number that shapes next week.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Logged sets list: tabular row per logged set. Set number on left,
 * reps × weight in the center, intensity on the right, delete affordance
 * trailing.
 */
function LoggedSetList() {
  const sets = [
    { n: 1, reps: 5, weight: 135, unit: 'lb', rir: 2 },
    { n: 2, reps: 5, weight: 135, unit: 'lb', rir: 1 },
  ]
  return (
    <div className="px-4 pb-3">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        Logged
      </div>
      <div className="border border-border bg-card divide-y divide-border/60">
        {sets.map((s) => (
          <div
            key={s.n}
            className="flex items-center gap-3 px-3 py-2 text-sm tabular-nums"
          >
            <span className="w-6 text-muted-foreground font-bold">{s.n}</span>
            <span className="flex-1 text-foreground font-semibold">
              {s.reps} reps <span className="text-muted-foreground">×</span>{' '}
              {s.weight} {s.unit}
            </span>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              RIR {s.rir}
            </span>
            <button
              type="button"
              className="p-1 text-muted-foreground/60 hover:text-error doom-focus-ring"
              aria-label={`Delete set ${s.n}`}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function InputArea({ expanded }: { expanded: 'weight' | null }) {
  return (
    <div className="px-4 pb-3 border-t border-border/60 pt-3 bg-card/40 space-y-2">
      {expanded === null && <RepsStepperMock />}
      {expanded === null ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <WeightTriggerMock />
          </div>
          <div className="flex-1">
            <RirTriggerMock />
          </div>
        </div>
      ) : (
        <WeightKeypadMock />
      )}
    </div>
  )
}

function RepsStepperMock() {
  return (
    <div>
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        Reps
      </span>
      <div className="flex items-center border border-border">
        <button
          type="button"
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground border-r border-border"
          style={{ boxShadow: RAISED_SHADOW }}
          aria-label="Decrease reps"
        >
          <Minus size={22} strokeWidth={2.5} />
        </button>

        <div
          className="flex-1 min-h-[44px] flex items-center justify-center text-2xl font-bold bg-input text-foreground tabular-nums min-w-[60px]"
          style={{ boxShadow: RECESSED_SHADOW }}
        >
          5
        </div>

        <button
          type="button"
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center bg-success text-success-foreground border-l border-border"
          style={{ boxShadow: RAISED_SHADOW }}
          aria-label="Increase reps"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

function WeightTriggerMock() {
  return (
    <div>
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        Weight (LB)
      </span>
      <button
        type="button"
        className="w-full h-12 px-4 flex items-center justify-center text-2xl font-bold bg-input text-foreground tabular-nums border border-border hover:border-primary/40 transition-all"
        style={{ boxShadow: RECESSED_SHADOW }}
        aria-label="Edit weight"
      >
        135
        <span className="text-sm font-semibold text-muted-foreground ml-2">
          lb
        </span>
      </button>
    </div>
  )
}

function RirTriggerMock() {
  return (
    <div>
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        RIR
      </span>
      <button
        type="button"
        className="w-full h-12 px-4 flex items-center justify-center bg-input border border-border hover:border-primary/40 transition-all"
        style={{ boxShadow: RECESSED_SHADOW }}
        aria-label="Edit RIR"
      >
        <span className="text-2xl font-bold text-foreground tabular-nums">2</span>
      </button>
    </div>
  )
}

/**
 * Weight keypad drawer. Bordered value display at top, 3x4 numeric grid,
 * then the CANCEL + DONE footer. CANCEL is muted (not full red surface)
 * per ticket #712: red is reserved for destructive confirmation, not
 * for "back out of an input drawer."
 */
function WeightKeypadMock() {
  return (
    <div>
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        Weight (LB)
      </span>

      <div
        className="w-full h-12 px-4 flex items-center justify-center border-2 border-primary text-2xl font-bold bg-input text-foreground tabular-nums"
        style={{
          boxShadow:
            'inset 0 1px 2px rgba(0,0,0,0.18), 0 0 8px rgba(var(--primary-rgb),0.2)',
        }}
      >
        135
        <span className="text-sm font-semibold text-muted-foreground ml-2">
          lb
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px mt-px bg-border">
        {[
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          'CLR',
          '0',
          'DEL',
        ].map((key) => (
          <button
            key={key}
            type="button"
            className={`h-11 flex items-center justify-center font-bold text-lg transition-colors ${
              key === 'CLR'
                ? 'bg-muted text-muted-foreground hover:bg-secondary text-sm uppercase tracking-wider'
                : key === 'DEL'
                  ? 'bg-muted text-muted-foreground hover:bg-secondary'
                  : 'bg-card text-foreground hover:bg-secondary'
            }`}
          >
            {key === 'DEL' ? <Delete size={18} /> : key}
          </button>
        ))}
      </div>

      <div className="flex gap-px mt-px">
        <button
          type="button"
          className="flex-1 h-11 bg-muted text-error font-bold uppercase tracking-wider text-sm hover:bg-muted/80 active:bg-muted/60 transition-colors"
          style={{ boxShadow: RAISED_SHADOW }}
          aria-label="Cancel weight entry"
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex-[2] h-11 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors"
          style={{ boxShadow: RAISED_SHADOW }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

/**
 * Footer: full-width primary LOG SET button. When the input drawer is
 * open the footer dims and the keypad's own DONE is the primary action,
 * so we hide the LOG SET button in that state (ticket #710 wants the
 * bottom bar geometry to feel intentional, not duplicated).
 */
function LogSetFooter({ expanded }: { expanded: 'weight' | null }) {
  if (expanded !== null) {
    return null
  }
  return (
    <div className="px-4 pb-4 pt-2">
      <button
        type="button"
        className="w-full py-3.5 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-base doom-button-3d doom-focus-ring"
      >
        Log Set
      </button>
    </div>
  )
}
