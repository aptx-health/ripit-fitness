import Link from 'next/link'
import type { ReactNode } from 'react'
import type { WeekLift } from '@/lib/insights/progress-records'
import { formatWeight, ordinal, signed } from './format'

/** Rows shared by the Records and Lifts panels. */

const CHIP = 'inline-block px-1.5 text-xs font-bold uppercase leading-5 tracking-wider'
export const PR_CHIP = `${CHIP} bg-accent text-accent-foreground`
export const MUTED_CHIP = `${CHIP} bg-muted text-muted-foreground`
/** Sessions in a row below the best before a lift reads as flat. */
const FLAT_SESSIONS = 3

/** "115×5", or "12 reps" for bodyweight. */
export function setText(weight: number, reps: number): string {
  return weight === 0 ? `${reps} reps` : `${formatWeight(weight)}×${reps}`
}

/** A lift done in the week: its best set and e1RM, the change since the last session, and "Flat". */
export function LiftRow({
  lift,
  data,
  pin,
  href,
}: {
  lift: WeekLift
  data: Record<string, string>
  pin?: ReactNode
  href?: string
}) {
  const { bestSet, e1rm, previousE1rm, bestE1rm, sessionsBelowBest } = lift
  const isFlat = sessionsBelowBest >= FLAT_SESSIONS && bestE1rm != null
  const set = setText(bestSet.weight, bestSet.reps)
  const detail = [
    e1rm == null ? set : `${set} · e1RM ${Math.round(e1rm)}`,
    isFlat ? `${ordinal(sessionsBelowBest)} session below ${Math.round(bestE1rm)}` : null,
  ]
    .filter(Boolean)
    .join(', ')
  const change = e1rm != null && previousE1rm != null ? e1rm - previousE1rm : null

  return (
    <Row
      data={data}
      name={lift.name}
      detail={detail}
      pin={pin}
      href={href}
      aside={
        (isFlat || change != null) && (
          <div className="flex items-center gap-2">
            {isFlat && <span className={MUTED_CHIP}>Flat</span>}
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

/** A row; with `href`, its name, detail and aside are one link, and the pin button stays outside it. */
export function Row({
  data,
  name,
  detail,
  aside,
  pin,
  href,
}: {
  data: Record<string, string>
  name: string
  detail: string
  aside?: ReactNode
  pin?: ReactNode
  href?: string
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-tight text-foreground">{name}</div>{' '}
        <div className="text-sm text-muted-foreground tabular-nums">{detail}</div>
      </div>
      {aside && <div className="shrink-0 text-right tabular-nums">{aside}</div>}
    </>
  )
  const inner = `flex min-h-14 items-center gap-3 py-2.5 pl-3 ${pin ? 'pr-0' : 'pr-3'}`
  if (!href) {
    return (
      <div {...data} className={inner}>
        {body}
        {pin}
      </div>
    )
  }
  return (
    <div {...data} className="flex items-center">
      <Link href={href} className={`${inner} min-w-0 flex-1 hover:bg-muted doom-focus-ring`}>
        {body}
      </Link>
      {pin}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-4 text-sm text-muted-foreground">{children}</p>
}
