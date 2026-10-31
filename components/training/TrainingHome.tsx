'use client'

import { Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useMounted } from '@/hooks/useMounted'
import { startFreestyleWorkout } from '@/lib/api/adhoc-workout'
import { FetchError } from '@/lib/api/fetch'
import { clientLogger } from '@/lib/client-logger'
import { formatDuration } from '@/lib/format/duration'
import { pluralize } from '@/lib/format/pluralize'
import type { CurrentProgram, RecentSession, TrainingHomeData, UpNext } from '@/lib/training/home'
import { programDetailHref } from '@/lib/training/program-href'

/**
 * The Training home: "what should I do next?" Sections appear only when they
 * have something to show, in a fixed order. Coach Suggestions (TL5) goes before
 * Up Next and Pinned Workouts (TL4) after it.
 */
export default function TrainingHome({ home }: { home: TrainingHomeData }) {
  const { upNext, recent, currentProgram } = home
  const isEmpty = !upNext && recent.length === 0 && !currentProgram

  return (
    <div className="space-y-6">
      {upNext && <UpNextSection upNext={upNext} />}
      {recent.length > 0 && <RecentSection recent={recent} />}
      {currentProgram && <CurrentProgramSection program={currentProgram} />}
      {isEmpty && <EmptyHome />}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground doom-label">{children}</h2>
  )
}

const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-bold uppercase tracking-wider text-sm'

function UpNextSection({ upNext }: { upNext: UpNext }) {
  return (
    <section aria-labelledby="up-next-heading">
      <SectionHeading>
        <span id="up-next-heading">Up Next</span>
      </SectionHeading>
      <div className="bg-card border border-border border-l-4 border-l-primary doom-noise p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{upNext.programName}</p>
          <p className="text-sm text-muted-foreground">
            Week {upNext.weekNumber} · Day {upNext.dayNumber}
          </p>
          <h3 className="text-xl font-bold text-foreground doom-heading">{upNext.workoutName}</h3>
          <p className="text-sm text-muted-foreground">{pluralize(upNext.exerciseCount, 'exercise')}</p>
        </div>
        <Link href={upNext.href} className={`${primaryButton} w-full`}>
          <Play size={16} />
          {upNext.hasDraft ? 'Continue' : 'Start Workout'}
        </Link>
      </div>
    </section>
  )
}

/**
 * A session's day in the viewer's time zone. Rendered only after hydration:
 * the server (UTC in prod) would put an evening session on the next day.
 */
function SessionDate({ date }: { date: Date }) {
  const mounted = useMounted()
  const d = new Date(date)
  return (
    <time dateTime={d.toISOString()}>
      {mounted ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null}
    </time>
  )
}

function RecentSection({ recent }: { recent: RecentSession[] }) {
  const router = useRouter()
  const busy = useRef(false)
  const [repeatingId, setRepeatingId] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null)

  const repeat = async (id: string) => {
    if (busy.current) return
    busy.current = true
    setRepeatingId(id)
    setFailure(null)
    try {
      const res = await fetch(`/api/workouts/completions/${id}/repeat`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.completionId) {
        router.push(`/training/adhoc/${body.completionId}`)
        return
      }
      setFailure({
        id,
        message: res.status === 409 && body.message ? body.message : "Couldn't repeat this workout. Please try again.",
      })
    } catch (err) {
      clientLogger.error('Failed to repeat session', err)
      setFailure({ id, message: "Couldn't repeat this workout. Check your connection and try again." })
    } finally {
      busy.current = false
      setRepeatingId(null)
    }
  }

  return (
    <section aria-labelledby="recent-heading">
      <SectionHeading>
        <span id="recent-heading">Recent Workouts</span>
      </SectionHeading>
      <ul className="bg-card border border-border doom-corners divide-y divide-border">
        {recent.map((session) => (
          <li key={session.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground doom-heading truncate">{session.name}</p>
                <p className="flex gap-2 text-sm text-muted-foreground">
                  <SessionDate date={session.completedAt} />
                  {session.durationSeconds != null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatDuration(session.durationSeconds)}</span>
                    </>
                  )}
                </p>
              </div>
              {session.canRepeat && (
                <button
                  type="button"
                  onClick={() => repeat(session.id)}
                  disabled={repeatingId !== null}
                  aria-label={`Repeat ${session.name}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {repeatingId === session.id ? 'Starting…' : 'Repeat'}
                </button>
              )}
            </div>
            {failure?.id === session.id && (
              <p role="alert" className="mt-2 text-sm text-error">
                {failure.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function CurrentProgramSection({ program }: { program: CurrentProgram }) {
  const percent = program.workoutsTotal > 0 ? Math.round((program.workoutsDone / program.workoutsTotal) * 100) : 0
  return (
    <section aria-labelledby="current-program-heading">
      <SectionHeading>
        <span id="current-program-heading">Current Program</span>
      </SectionHeading>
      <div className="bg-card border border-border doom-noise p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-foreground doom-heading">{program.programName}</h3>
          <p className="text-sm text-muted-foreground">
            Week {program.weekNumber} of {program.totalWeeks}
          </p>
        </div>
        <div>
          <div
            role="progressbar"
            aria-label="Program progress"
            aria-valuemin={0}
            aria-valuemax={program.workoutsTotal}
            aria-valuenow={program.workoutsDone}
            className="h-2 w-full bg-muted overflow-hidden"
          >
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {program.workoutsDone} of {program.workoutsTotal} workouts done
          </p>
        </div>
        <Link
          href={programDetailHref(program.programId)}
          className="inline-block text-sm font-semibold uppercase tracking-wider text-primary hover:text-primary-hover doom-link"
        >
          View Program →
        </Link>
      </div>
    </section>
  )
}

function EmptyHome() {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Starts a freestyle workout the way the center Workout button's sheet does.
  const start = async () => {
    if (starting) return
    setStarting(true)
    setError(null)
    try {
      const completion = await startFreestyleWorkout()
      router.push(`/training/adhoc/${completion.id}?new=1`)
    } catch (err) {
      clientLogger.error('Failed to start freestyle workout:', err)
      setError(
        err instanceof FetchError && err.status === 409
          ? 'You already have a workout in progress.'
          : "Couldn't start a workout. Check your connection and try again."
      )
      setStarting(false)
    }
  }

  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center space-y-4">
      <p className="text-muted-foreground">Nothing planned yet. Start lifting now, or pick a program to follow.</p>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={start} disabled={starting} className={`${primaryButton} disabled:opacity-50`}>
          <Play size={16} />
          {starting ? 'Starting…' : 'Start a workout'}
        </button>
        <Link
          href="/programs"
          className="flex items-center justify-center w-full py-3 border-2 border-border bg-transparent text-muted-foreground transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring hover:bg-muted/40 hover:border-primary hover:text-foreground"
        >
          Find a program
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}
