'use client'

import { Dumbbell, Trophy } from 'lucide-react'
import { useState } from 'react'
import PaperTabs from '@/components/ui/PaperTabs'
import { pluralize } from '@/lib/format/pluralize'
import type { PinnedLift } from '@/lib/insights/pinned-lifts'
import type { WeekLift, WeekRecord } from '@/lib/insights/progress-records'
import { formatWeight, unitLabel } from './format'
import LiftsPanel from './LiftsPanel'
import { Empty, PR_CHIP, Row } from './rows'

/**
 * The Records / Lifts folder (S2): the records set in the shown week, and
 * every exercise done in it, pinned lifts first (LiftsPanel). Only the
 * selected tab's panel is rendered. The payload carries raw numbers; the
 * wording, and what counts as "Flat", is here and in rows.tsx.
 */

type Tab = 'records' | 'lifts'
const ID = 'progress-records'

export default function RecordsLifts({
  records,
  lifts,
  pinned,
  weightUnit,
  weekStart,
  onSavePins,
}: {
  records: WeekRecord[]
  lifts: WeekLift[]
  pinned: PinnedLift[]
  weightUnit: 'lbs' | 'kg'
  /** The shown week, for the lift rows' links. */
  weekStart: string
  /** Saves the whole pin list in order and reloads the week; false when it failed. */
  onSavePins: (ids: string[]) => Promise<boolean>
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
        ) : (
          <LiftsPanel lifts={lifts} pinned={pinned} weightUnit={weightUnit} weekStart={weekStart} onSavePins={onSavePins} />
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
