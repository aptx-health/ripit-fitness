import type { WeekStats } from '@/lib/insights/progress'
import { formatRpe, weekOfLabel } from './format'

/**
 * "Last 8 weeks": working sets per week as bars, oldest first, with each
 * week's average RPE beneath its bar ("–" when effort isn't tracked enough).
 * The selected week's bar is the highlighted one. Hand-drawn SVG bars in
 * theme tokens (no chart library), so it follows light and dark. Each week is
 * one labelled image; the gridlines and axis text are hidden from readers.
 */

const AXIS = 'text-[11px] font-semibold leading-none tabular-nums'
const MUTED = `${AXIS} text-muted-foreground`

export default function WeeklySetsChart({
  weeks,
  selected,
  isCurrentWeek,
}: {
  weeks: WeekStats[]
  selected: string
  /** The selected week is this week: its label reads "This wk". */
  isCurrentWeek: boolean
}) {
  const max = Math.max(20, Math.ceil(Math.max(...weeks.map((w) => w.workingSets)) / 20) * 20)
  const labelled = new Set([0, Math.floor((weeks.length - 1) / 2), weeks.length - 1])

  return (
    <div role="group" aria-label="Working sets per week" className="flex gap-1.5">
      <div aria-hidden="true" className="flex w-7 shrink-0 flex-col text-right">
        <div className={`flex h-28 flex-col justify-between ${MUTED}`}>
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className="h-5" />
        <div className={`flex h-5 items-end justify-end ${MUTED}`}>RPE</div>
      </div>

      <div className="relative min-w-0 flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full"
        >
          {[0.5, 50, 99.5].map((y) => (
            <line key={y} x1={0} x2={100} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="relative flex gap-1.5">
          {weeks.map((w, i) => {
            const isSelected = w.weekStart === selected
            const rpe = formatRpe(w.effort?.avgRpe ?? null)
            const height = (w.workingSets / max) * 100
            return (
              <div
                key={w.weekStart}
                data-week={w.weekStart}
                data-selected={isSelected ? 'true' : undefined}
                role="img"
                aria-label={`Week of ${weekOfLabel(w.weekStart)}: ${w.workingSets} sets, RPE ${rpe}`}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <svg aria-hidden="true" viewBox="0 0 10 100" preserveAspectRatio="none" className="h-28 w-full">
                  <rect x={0} y={100 - height} width={10} height={height} fill={isSelected ? 'var(--primary)' : 'var(--secondary)'} />
                </svg>
                <span aria-hidden="true" className={`flex h-5 items-end whitespace-nowrap ${MUTED}`}>
                  {!labelled.has(i) ? '' : isSelected && isCurrentWeek ? 'This wk' : weekOfLabel(w.weekStart)}
                </span>
                <span
                  className={`flex h-5 items-end ${AXIS} ${
                    (w.effort?.avgRpe ?? 0) >= 9 ? 'text-error-text' : isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {rpe}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
