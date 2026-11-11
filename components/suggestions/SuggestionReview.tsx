'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useMounted } from '@/hooks/useMounted'
import { clientLogger } from '@/lib/client-logger'
import { libraryHref } from '@/lib/library/links'
import type { SuggestionDetail } from '@/lib/suggestions/types'
import { programDetailHref } from '@/lib/training/program-href'
import BundledExerciseChoices, { type BundledChoice } from './BundledExerciseChoices'
import SuggestionBody from './SuggestionBody'

type Stage =
  | { name: 'deciding' }
  | { name: 'make-active'; programId: string }
  | { name: 'added-workout' }
  | { name: 'updated' }
  | { name: 'closed'; message: string }

const WORKOUT_KINDS = new Set(['saved_workout.create', 'saved_workout.update'])

const primaryButton =
  'inline-flex flex-1 items-center justify-center px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-bold uppercase tracking-wider text-sm disabled:opacity-50'
const secondaryButton =
  'inline-flex flex-1 items-center justify-center px-4 py-3 border-2 border-border text-foreground hover:bg-muted doom-focus-ring font-semibold uppercase tracking-wider text-sm disabled:opacity-50'

/** The decision route's user wording (TL5a "Error wording"), for its known codes only. */
const KNOWN_CODES = new Set(['not_pending', 'conflict', 'not_found', 'invalid'])
function acceptError(body: { code?: unknown; error?: unknown }): string {
  if (KNOWN_CODES.has(String(body.code)) && typeof body.error === 'string') return body.error
  return "Couldn't accept this suggestion. Please try again."
}

/**
 * One suggestion: what it is, why, and what it would change, with Accept and
 * Reject while it is pending. Agent text is rendered as plain text only. One
 * request runs at a time.
 */
export default function SuggestionReview({ suggestion }: { suggestion: SuggestionDetail }) {
  const router = useRouter()
  const mounted = useMounted()
  const busy = useRef(false)
  const [working, setWorking] = useState(false)
  const [stage, setStage] = useState<Stage>({ name: 'deciding' })
  const [error, setError] = useState<string | null>(null)
  const [choices, setChoices] = useState<Record<string, BundledChoice>>({})
  const bundled = suggestion.customExercises ?? []

  const pending = suggestion.status === 'pending' && suggestion.outcome === null

  // Runs one request at a time; the callback reports failures through setError.
  const run = async (task: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    setError(null)
    try {
      await task()
    } finally {
      busy.current = false
      setWorking(false)
    }
  }

  const accept = () =>
    run(async () => {
      const unpicked = bundled.find((b) => {
        const c = choices[b.sourceId]
        return c?.use === 'mine' && !c.exerciseDefinitionId
      })
      if (unpicked) {
        setError(`Pick one of your exercises for "${unpicked.name}", or add a copy.`)
        return
      }
      try {
        const res = await fetch(`/api/suggestions/${suggestion.id}/accept`, {
          method: 'POST',
          ...(bundled.length > 0 && {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ exercises: acceptChoices(bundled.map((b) => b.sourceId), choices) }),
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok) {
          if (suggestion.kind === 'program.create' && body.programId) {
            setStage({ name: 'make-active', programId: body.programId })
          } else {
            setStage(WORKOUT_KINDS.has(suggestion.kind) ? { name: 'added-workout' } : { name: 'updated' })
          }
          // No router.refresh(): the page would re-render as decided and drop
          // the "Make it active?" step.
          return
        }
        if (res.status === 409 && body.code === 'conflict') {
          setStage({ name: 'closed', message: 'This suggestion no longer applies.' })
          return
        }
        if (body.code === 'not_pending') setStage({ name: 'closed', message: acceptError(body) })
        else setError(acceptError(body))
      } catch (err) {
        clientLogger.error('Failed to accept suggestion', err)
        setError("Couldn't accept this suggestion. Check your connection and try again.")
      }
    })

  const reject = () =>
    run(async () => {
      try {
        const res = await fetch(`/api/suggestions/${suggestion.id}/reject`, { method: 'POST' })
        if (!res.ok) {
          setError("Couldn't reject this suggestion. Please try again.")
          return
        }
        // Back to the list while others are waiting, else to Training.
        let left = 1
        try {
          const list = await fetch('/api/suggestions', { cache: 'no-store' })
          if (list.ok) left = ((await list.json()).suggestions ?? []).length
        } catch {
          // Unknown: the list page handles an empty list too.
        }
        router.push(left > 0 ? '/suggestions' : '/training')
      } catch (err) {
        clientLogger.error('Failed to reject suggestion', err)
        setError("Couldn't reject this suggestion. Check your connection and try again.")
      }
    })

  const makeActive = (programId: string) =>
    run(async () => {
      try {
        const res = await fetch(`/api/programs/${programId}/activate`, { method: 'POST' })
        if (!res.ok) {
          setError("Couldn't make it active. The program is in your Library.")
          return
        }
        router.push(programDetailHref(programId))
      } catch (err) {
        clientLogger.error('Failed to activate program', err)
        setError("Couldn't make it active. Check your connection and try again.")
      }
    })

  const created = new Date(suggestion.createdAt)

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{suggestion.kindLabel}</p>
        <h1 className="text-xl font-bold text-foreground break-words">{suggestion.title}</h1>
        <p className="text-sm text-muted-foreground">
          From {suggestion.from} · Suggested{' '}
          <time dateTime={created.toISOString()}>
            {mounted ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null}
          </time>
        </p>
      </div>

      {suggestion.rationale && (
        <section className="space-y-1.5">
          <h2 className="doom-label text-secondary">Why</h2>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted p-3 border border-border">
            {suggestion.rationale}
          </p>
        </section>
      )}

      <section className="space-y-1.5">
        <h2 className="doom-label text-secondary">What it changes</h2>
        <SuggestionBody body={suggestion.body} />
      </section>

      {pending && stage.name === 'deciding' && bundled.length > 0 && (
        <BundledExerciseChoices
          exercises={bundled}
          coachName={suggestion.from}
          choices={choices}
          onChange={(sourceId, choice) => setChoices((prev) => ({ ...prev, [sourceId]: choice }))}
          disabled={working}
        />
      )}

      {error && (
        <p role="alert" className="border-2 border-error-border bg-error-muted text-error-text p-3 text-sm">
          {error}
        </p>
      )}

      <Decision
        pending={pending}
        outcome={suggestion.outcome}
        stage={stage}
        working={working}
        onAccept={accept}
        onReject={reject}
        onMakeActive={makeActive}
        onNotNow={(programId) => router.push(programDetailHref(programId))}
      />
    </div>
  )
}

/** The accept body's choices: each bundled exercise as a copy unless one of the user's own was picked. */
function acceptChoices(sourceIds: string[], choices: Record<string, BundledChoice>) {
  return Object.fromEntries(
    sourceIds.map((id) => {
      const c = choices[id]
      return [id, c?.use === 'mine' ? { use: 'mine', exerciseDefinitionId: c.exerciseDefinitionId } : { use: 'copy' }]
    })
  )
}

function Decision({
  pending,
  outcome,
  stage,
  working,
  onAccept,
  onReject,
  onMakeActive,
  onNotNow,
}: {
  pending: boolean
  outcome: string | null
  stage: Stage
  working: boolean
  onAccept: () => void
  onReject: () => void
  onMakeActive: (programId: string) => void
  onNotNow: (programId: string) => void
}) {
  const box = 'border-2 border-border bg-card p-4 space-y-3'

  if (!pending) {
    return (
      <div className={box}>
        <p className="font-bold uppercase tracking-wider text-foreground">{outcome}</p>
      </div>
    )
  }

  switch (stage.name) {
    case 'make-active':
      return (
        <div className={box}>
          <p className="font-bold text-foreground">Added to My Programs. Make it active?</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => onMakeActive(stage.programId)} disabled={working} className={primaryButton}>
              Make active
            </button>
            <button type="button" onClick={() => onNotNow(stage.programId)} disabled={working} className={secondaryButton}>
              Not now
            </button>
          </div>
        </div>
      )
    case 'added-workout':
      return (
        <div className={box}>
          <p className="font-bold text-foreground">Added to My Workouts.</p>
          <Link href={libraryHref({ type: 'workouts' })} className="text-sm font-semibold uppercase tracking-wider text-primary doom-link">
            Open My Workouts
          </Link>
        </div>
      )
    case 'updated':
      return (
        <div className={box}>
          <p className="font-bold uppercase tracking-wider text-foreground">Updated</p>
        </div>
      )
    case 'closed':
      return (
        <div className={box}>
          <p role="alert" className="font-bold text-foreground">
            {stage.message}
          </p>
        </div>
      )
    default:
      return (
        <div className="flex gap-3">
          <button type="button" onClick={onAccept} disabled={working} className={primaryButton}>
            Accept
          </button>
          <button type="button" onClick={onReject} disabled={working} className={secondaryButton}>
            Reject
          </button>
        </div>
      )
  }
}
