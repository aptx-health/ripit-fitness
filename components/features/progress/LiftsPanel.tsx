'use client'

import { ChevronDown, ListOrdered, Pin } from 'lucide-react'
import { Fragment, type ReactNode, useState } from 'react'
import { MAX_PINS, type PinnedLift } from '@/lib/insights/pinned-lifts'
import type { WeekLift } from '@/lib/insights/progress-records'
import { unitLabel } from './format'
import PinsEditor, { PIN_LIMIT_MESSAGE } from './PinsEditor'
import { Empty, LiftRow, MUTED_CHIP, Row, setText } from './rows'

/**
 * The Lifts tab (S3): the pinned lifts first, each with this week's numbers
 * or its last session, then the week's other lifts behind a toggle. With no
 * pins it is the S2 list plus a hint. Every change sends the whole pin list
 * and shows the next report; nothing changes on screen until the save lands.
 */

const SAVE_FAILED = "Couldn't save your tracked lifts. Try again."

const PIN_BUTTON =
  'flex h-12 w-12 shrink-0 items-center justify-center doom-focus-ring disabled:cursor-not-allowed disabled:opacity-50'
const TEXT_BUTTON =
  'flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm font-bold uppercase tracking-wider doom-focus-ring hover:bg-muted'

export default function LiftsPanel({
  lifts,
  pinned,
  weightUnit,
  weekStart,
  onSavePins,
}: {
  lifts: WeekLift[]
  pinned: PinnedLift[]
  weightUnit: 'lbs' | 'kg'
  /** The shown week: each row links to its lift's page with it, so Back returns here. */
  weekStart: string
  onSavePins: (ids: string[]) => Promise<boolean>
}) {
  const [alsoOpen, setAlsoOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  /** A refused or failed pin, shown under the row that was tapped. */
  const [message, setMessage] = useState<{ id: string; text: string; alert: boolean } | null>(null)

  const pinnedIds = pinned.map((p) => p.exerciseDefinitionId)
  const liftHref = (id: string) => `/progress/lift/${encodeURIComponent(id)}?week=${weekStart}`
  const others = lifts.filter((l) => !pinnedIds.includes(l.exerciseDefinitionId))

  const save = async (id: string, ids: string[]) => {
    setSaving(true)
    setMessage(null)
    const ok = await onSavePins(ids)
    setSaving(false)
    if (!ok) setMessage({ id, text: SAVE_FAILED, alert: true })
  }
  const pin = (id: string) => {
    if (pinnedIds.length >= MAX_PINS) setMessage({ id, text: PIN_LIMIT_MESSAGE, alert: false })
    else save(id, [...pinnedIds, id])
  }
  const unpin = (id: string) => save(id, pinnedIds.filter((p) => p !== id))
  const rowMessage = (id: string) =>
    message?.id === id && (
      <p role={message.alert ? 'alert' : 'status'} className="px-3 py-2 text-sm font-bold text-error">
        {message.text}
      </p>
    )

  const pinButton = (name: string, id: string, isPinned: boolean) => (
    <button
      type="button"
      aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${name}`}
      disabled={saving}
      onClick={() => (isPinned ? unpin(id) : pin(id))}
      className={`${PIN_BUTTON} ${isPinned ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Pin size={20} strokeWidth={2.25} fill={isPinned ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
  const liftRow = (l: WeekLift) => (
    <Fragment key={l.exerciseDefinitionId}>
      <LiftRow
        lift={l}
        data={{ 'data-lift': l.exerciseDefinitionId }}
        pin={pinButton(l.name, l.exerciseDefinitionId, false)}
        href={liftHref(l.exerciseDefinitionId)}
      />
      {rowMessage(l.exerciseDefinitionId)}
    </Fragment>
  )

  return (
    <>
      {pinned.length > 0 ? (
        <>
          <h3 className="px-3 pb-1 pt-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pinned</h3>
          {pinned.map((p) => (
            <Fragment key={p.exerciseDefinitionId}>
              <PinnedRow
                pinned={p}
                unit={weightUnit}
                pin={pinButton(p.name, p.exerciseDefinitionId, true)}
                href={liftHref(p.exerciseDefinitionId)}
              />
              {rowMessage(p.exerciseDefinitionId)}
            </Fragment>
          ))}
          {others.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={alsoOpen}
                onClick={() => setAlsoOpen((open) => !open)}
                className={`${TEXT_BUTTON} text-muted-foreground`}
              >
                <span className="flex-1">Also this week ({others.length})</span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`transition-transform ${alsoOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {alsoOpen && others.map(liftRow)}
            </>
          )}
        </>
      ) : (
        <>
          {lifts.length === 0 ? <Empty>No lifts this week</Empty> : lifts.map(liftRow)}
          <p className="px-3 py-2.5 text-sm text-muted-foreground">Pin lifts to track them here.</p>
        </>
      )}

      <button type="button" onClick={() => setEditing(true)} className={`${TEXT_BUTTON} text-foreground`}>
        <ListOrdered size={18} aria-hidden="true" />
        Edit tracked lifts
      </button>

      {editing && (
        <PinsEditor
          pins={pinned.map((p) => ({ id: p.exerciseDefinitionId, name: p.name }))}
          onSave={onSavePins}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

/** A pinned lift: as in S2 when done this week, else its last session or "No sessions yet". */
function PinnedRow({ pinned, unit, pin, href }: { pinned: PinnedLift; unit: 'lbs' | 'kg'; pin: ReactNode; href: string }) {
  const data = { 'data-pinned': pinned.exerciseDefinitionId }
  if (pinned.lift) return <LiftRow lift={pinned.lift} data={data} pin={pin} href={href} />

  const { last } = pinned
  const detail = !last
    ? 'No sessions yet'
    : `Last: ${setText(last.weight, last.reps)}${last.e1rm == null ? '' : ` · e1RM ${Math.round(last.e1rm)} ${unitLabel(unit)}`}`
  return (
    <Row
      data={data}
      name={pinned.name}
      detail={detail}
      pin={pin}
      href={href}
      aside={last && <span className={MUTED_CHIP}>Not this week</span>}
    />
  )
}
