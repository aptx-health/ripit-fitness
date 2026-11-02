'use client'

import { Dumbbell, Trophy } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import PaperTabs from '@/components/ui/PaperTabs'
import { pluralize } from '@/lib/format/pluralize'
import type { WeekLift, WeekRecord } from '@/lib/insights/progress-records'
import { formatWeight, ordinal, signed, unitLabel } from './format'

/**
 * The Records / Lifts folder (S2): the records set in the shown week, and
 * every exercise done in it. Only the selected tab's panel is rendered. The
 * payload carries raw numbers; the wording, and what counts as "Flat", is here.
 */

type Tab = 'records' | 'lifts'
const ID = 'progress-records'
/** Sessions in a row below the best before a lift reads as flat. */
const FLAT_SESSIONS = 3

const CHIP = 'inline-block px-1.5 text-xs font-bold uppercase leading-5 tracking-wider'
const PR_CHIP = `${CHIP} bg-accent text-accent-foreground`
const FLAT_CHIP = `${CHIP} bg-muted text-muted-foreground`

export default function RecordsLifts({
  records,
  lifts,
  weightUnit,
}: {
  records: WeekRecord[]
  lifts: WeekLift[]
  weightUnit: 'lbs' | 'kg'
}) {
  const [tab, setTab] = useState<Tab>('records')

  return (
    <section aria-label="Records and lifts">
      <PaperTabs
        name="Records and lifts"
        idPrefix={ID}
        tone="coach"
        tabs={[
          {
            id: 'records',
            label: 'Records',
            icon: <Trophy size={16} aria-hidden="true" />,
            ...(records.length > 0 && { count: records.length, countLabel: pluralize(records.length, 'record') }),
          },
          { id: 'lifts', label: 'Lifts', icon: <Dumbbell size={16} aria-hidden="true" /> },
        ]}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      <div
        role="tabpanel"
        id={`${ID}-panel-${tab}`}
        aria-labelledby={`${ID}-tab-${tab}`}
        className="folder-box border-2 border-accent bg-card divide-y divide-border"
      >
        {tab === 'records' ? (
          records.length === 0 ? (
            <Empty>No records this week</Empty>
          ) : (
            records.map((r) => <RecordRow key={r.exerciseDefinitionId} record={r} unit={weightUnit} />)
          )
        ) : lifts.length === 0 ? (
          <Empty>No lifts this week</Empty>
        ) : (
          lifts.map((l) => <LiftRow key={l.exerciseDefinitionId} lift={l} />)
        )}
      </div>
    </section>
  )
}

function recordDetail(r: WeekRecord, unit: 'lbs' | 'kg'): string {
  if (r.weight === 0) return `${r.reps} reps (was ${r.previous})`
  const set = `${formatWeight(r.weight)}×${r.reps}`
  if (r.kind === 'e1rm') return `${set} · e1RM ${Math.round(r.e1rm ?? 0)} ${unitLabel(unit)} (was ${Math.round(r.previous)})`
  return `${set} · best ${r.reps}-rep set (was ${formatWeight(r.previous)})`
}

function RecordRow({ record, unit }: { record: WeekRecord; unit: 'lbs' | 'kg' }) {
  return (
    <Row
      data={{ 'data-record': record.exerciseDefinitionId }}
      name={record.name}
      detail={recordDetail(record, unit)}
      aside={<span className={PR_CHIP}>{record.kind === 'e1rm' ? 'PR' : 'Rep PR'}</span>}
    />
  )
}

function LiftRow({ lift }: { lift: WeekLift }) {
  const { bestSet, e1rm, previousE1rm, bestE1rm, sessionsBelowBest } = lift
  const isFlat = sessionsBelowBest >= FLAT_SESSIONS && bestE1rm != null
  const set = bestSet.weight === 0 ? `${bestSet.reps} reps` : `${formatWeight(bestSet.weight)}×${bestSet.reps}`
  const detail = [
    e1rm == null ? set : `${set} · e1RM ${Math.round(e1rm)}`,
    isFlat ? `${ordinal(sessionsBelowBest)} session below ${Math.round(bestE1rm)}` : null,
  ]
    .filter(Boolean)
    .join(', ')
  const change = e1rm != null && previousE1rm != null ? e1rm - previousE1rm : null

  return (
    <Row
      data={{ 'data-lift': lift.exerciseDefinitionId }}
      name={lift.name}
      detail={detail}
      aside={
        (isFlat || change != null) && (
          <div className="flex items-center gap-2">
            {isFlat && <span className={FLAT_CHIP}>Flat</span>}
            {change != null && (
              <span
                className={`text-sm font-bold ${Math.round(change) > 0 ? 'text-success-text' : 'text-foreground'}`}
                title="e1RM change since the last session"
              >
                {signed(change, (n) => String(Math.round(n)))}
              </span>
            )}
          </div>
        )
      }
    />
  )
}

function Row({
  data,
  name,
  detail,
  aside,
}: {
  data: Record<string, string>
  name: string
  detail: string
  aside?: ReactNode
}) {
  return (
    <div {...data} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-tight text-foreground">{name}</div>{' '}
        <div className="text-sm text-muted-foreground tabular-nums">{detail}</div>
      </div>
      {aside && <div className="shrink-0 text-right tabular-nums">{aside}</div>}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-4 text-sm text-muted-foreground">{children}</p>
}
