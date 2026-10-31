'use client'

import { BookOpen, ChevronRight, Clock, Megaphone, Pin, Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useMounted } from '@/hooks/useMounted'
import { clientLogger } from '@/lib/client-logger'
import { formatDuration } from '@/lib/format/duration'
import { pluralize } from '@/lib/format/pluralize'
import { libraryHref } from '@/lib/library/links'
import { suggestionKindLabel, suggestionKindShortLabel } from '@/lib/suggestions/kinds'
import type { SuggestionItem } from '@/lib/suggestions/types'
import type { CurrentProgram, PinnedWorkout, RecentSession, TrainingHomeData, UpNext } from '@/lib/training/home'
import { programDetailHref } from '@/lib/training/program-href'
import SectionTab, { SECTION_BOX } from './SectionTab'
import TabbedBlock from './TabbedBlock'

/**
 * The Training home: "what should I do next?", as three folder blocks in a
 * fixed order:
 *   1. From your coach (only with pending suggestions)
 *   2. Workouts: Pinned Workouts | Recent (hidden with neither)
 *   3. Program: Up Next | Active Program (always; a placeholder without one)
 * The two-tab blocks switch client-side and remember the choice per device
 * (TabbedBlock). Pinned Start and Recent Repeat share one session starter, so
 * only one start request runs at a time on the whole page.
 */
export default function TrainingHome({ home }: { home: TrainingHomeData }) {
  const { suggestions, upNext, pinned, recent, currentProgram } = home
  const starter = useSessionStart()

  return (
    <div className="space-y-6">
      {suggestions.count > 0 && <SuggestionsSection count={suggestions.count} items={suggestions.items} />}
      {(pinned.length > 0 || recent.length > 0) && (
        <TabbedBlock
          name="Workouts"
          idPrefix="workouts"
          storageKey="training.workoutsTab"
          tone="mine"
          defaultTab={pinned.length > 0 ? 'pinned' : 'recent'}
          tabs={[
            {
              id: 'pinned',
              label: 'Pinned Workouts',
              icon: <Pin size={16} aria-hidden="true" />,
              count: pinned.length,
              countLabel: pluralize(pinned.length, 'pinned workout'),
              hasContent: pinned.length > 0,
              panel: <PinnedPanel pinned={pinned} starter={starter} />,
            },
            {
              id: 'recent',
              label: 'Recent',
              icon: <Clock size={16} aria-hidden="true" />,
              hasContent: recent.length > 0,
              panel: <RecentPanel recent={recent} starter={starter} />,
            },
          ]}
        />
      )}
      <TabbedBlock
        name="Program"
        idPrefix="program"
        storageKey="training.programTab"
        tone="next"
        defaultTab={upNext ? 'up-next' : 'active'}
        tabs={[
          {
            id: 'up-next',
            label: 'Up Next',
            icon: <Play size={16} aria-hidden="true" />,
            hasContent: Boolean(currentProgram && upNext),
            panel: !currentProgram ? <NoProgram /> : upNext ? <UpNextPanel upNext={upNext} /> : <AllDone />,
          },
          {
            id: 'active',
            label: 'Active Program',
            icon: <BookOpen size={16} aria-hidden="true" />,
            hasContent: Boolean(currentProgram),
            panel: currentProgram ? <ActiveProgramPanel program={currentProgram} upNext={upNext} /> : <NoProgram />,
          },
        ]}
      />
    </div>
  )
}

/**
 * The day a suggestion was made, relative to the viewer's today ("today",
 * "yesterday", "Oct 28"). Client-only, like SessionDate: the server's time zone
 * would shift it.
 */
function SuggestedDay({ date }: { date: Date }) {
  const mounted = useMounted()
  if (!mounted) return null
  const d = new Date(date)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  if (days === 0) return <>today</>
  if (days === 1) return <>yesterday</>
  return <>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
}

/** The newest suggestion in full, the next ones as rows, under the coach's tab. */
function SuggestionsSection({ count, items }: { count: number; items: SuggestionItem[] }) {
  const [newest, ...rest] = items
  const others = rest.slice(0, 2)
  return (
    <section aria-labelledby="suggestions-heading">
      <SectionTab
        variant="coach"
        id="suggestions-heading"
        icon={<Megaphone size={16} />}
        label="From your coach"
        count={count}
        countLabel={pluralize(count, 'suggestion')}
        action={{ href: '/suggestions', label: 'All suggestions' }}
      />
      <div className={SECTION_BOX.coach}>
        {newest && (
          <div className="p-4">
            {/* The tab already says "From your coach": the card starts with the kind. */}
            <span className="inline-block bg-foreground px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-card">
              {suggestionKindLabel(newest.kind)}
            </span>
            <h3 className="mt-1.5 text-xl font-bold leading-tight text-foreground break-words">{newest.title}</h3>
            <p className="text-sm text-muted-foreground">
              {newest.exerciseCount != null && `${pluralize(newest.exerciseCount, 'exercise')} · `}
              suggested <SuggestedDay date={newest.createdAt} />
            </p>
            {/* Quote marks in CSS, so the text is the rationale exactly. */}
            <blockquote className="my-3 border-l-[3px] border-accent pl-2.5 text-sm text-muted-foreground line-clamp-2 break-words before:content-['“'] after:content-['”']">
              {newest.rationale}
            </blockquote>
            <Link
              href={`/suggestions/${newest.id}`}
              className="flex w-full items-center justify-center px-4 py-3 bg-accent text-accent-foreground hover:bg-accent-hover doom-focus-ring font-bold uppercase tracking-wider text-sm"
              // Not every theme defines --accent-active; fall back to the hover shade.
              style={{
                boxShadow:
                  '0 4px 0 var(--accent-active, var(--accent-hover)), 0 6px 8px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.3)',
              }}
            >
              Review suggestion
            </Link>
          </div>
        )}
        {others.length > 0 && (
          <ul className="border-t border-dashed border-accent">
            {others.map((item) => (
              <li key={item.id} className="border-b border-dashed border-accent/40 last:border-b-0">
                <Link
                  href={`/suggestions/${item.id}`}
                  className="flex items-center gap-2.5 px-4 py-3 text-foreground hover:bg-accent/10 doom-focus-ring"
                >
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                    {suggestionKindShortLabel(item.kind)}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{item.title}</span>
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-bold uppercase tracking-wider text-sm'

function UpNextPanel({ upNext }: { upNext: UpNext }) {
  return (
    <div className="doom-noise p-4 space-y-3">
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
  )
}

/** A program with every workout done: Up Next has nothing to start. */
function AllDone() {
  return <p className="px-4 py-5 text-sm text-muted-foreground">Every workout in this program is done.</p>
}

/** Without an active program both Program tabs show this. */
function NoProgram() {
  return (
    <div className="px-4 py-5 text-center space-y-3">
      <h3 className="text-lg font-bold uppercase tracking-wider text-foreground">No active program</h3>
      <p className="text-sm text-muted-foreground">Pick a program to follow and your next workout shows up here.</p>
      <Link
        href={libraryHref({ type: 'programs', tab: 'browse' })}
        className="flex items-center justify-center w-full py-3 border-2 border-border bg-transparent text-muted-foreground transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring hover:bg-muted/40 hover:border-primary hover:text-foreground"
      >
        Find a program
      </Link>
    </div>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-5 text-sm text-muted-foreground">{children}</p>
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

/**
 * POSTs a start route that answers { completionId } (or 409 DRAFT_EXISTS with
 * a message) and opens the new session in the ad-hoc logger. One request at a
 * time for everything that uses this starter; a failure is shown on the row
 * that asked.
 */
function useSessionStart() {
  const router = useRouter()
  const busy = useRef(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null)

  const start = async (id: string, url: string, verb: 'start' | 'repeat') => {
    if (busy.current) return
    busy.current = true
    setStartingId(id)
    setFailure(null)
    try {
      const res = await fetch(url, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.completionId) {
        router.push(`/training/adhoc/${body.completionId}`)
        return
      }
      setFailure({
        id,
        message: res.status === 409 && body.message ? body.message : `Couldn't ${verb} this workout. Please try again.`,
      })
    } catch (err) {
      clientLogger.error(`Failed to ${verb} workout`, err)
      setFailure({ id, message: `Couldn't ${verb} this workout. Check your connection and try again.` })
    } finally {
      busy.current = false
      setStartingId(null)
    }
  }

  return { start, startingId, failure }
}

type SessionStarter = ReturnType<typeof useSessionStart>

function RowFailure({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-2 text-sm text-error">
      {message}
    </p>
  )
}

function PinnedPanel({ pinned, starter }: { pinned: PinnedWorkout[]; starter: SessionStarter }) {
  const { start, startingId, failure } = starter
  if (pinned.length === 0) return <EmptyLine>No pinned workouts yet. Pin one from My Workouts.</EmptyLine>

  return (
    <ul className="divide-y divide-border">
        {pinned.map((workout) => (
          <li key={workout.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{workout.name}</p>
                <p className="text-sm text-muted-foreground">{pluralize(workout.exerciseCount, 'exercise')}</p>
              </div>
              <button
                type="button"
                onClick={() => start(workout.id, `/api/workouts/saved/${workout.id}/start`, 'start')}
                disabled={startingId !== null}
                aria-label={`Start ${workout.name}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                <Play size={14} />
                {startingId === workout.id ? 'Starting…' : 'Start'}
              </button>
            </div>
            {failure?.id === workout.id && <RowFailure message={failure.message} />}
          </li>
        ))}
    </ul>
  )
}

function RecentPanel({ recent, starter }: { recent: RecentSession[]; starter: SessionStarter }) {
  const { start, startingId: repeatingId, failure } = starter
  const repeat = (id: string) => start(id, `/api/workouts/completions/${id}/repeat`, 'repeat')
  if (recent.length === 0) return <EmptyLine>No finished workouts yet.</EmptyLine>

  return (
    <ul className="divide-y divide-border">
        {recent.map((session) => (
          <li key={session.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{session.name}</p>
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
            {failure?.id === session.id && <RowFailure message={failure.message} />}
          </li>
        ))}
    </ul>
  )
}

function ActiveProgramPanel({ program, upNext }: { program: CurrentProgram; upNext: UpNext | null }) {
  const percent = program.workoutsTotal > 0 ? Math.round((program.workoutsDone / program.workoutsTotal) * 100) : 0
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{program.programName}</h3>
          <p className="text-sm text-muted-foreground">
            Week {program.weekNumber} of {program.totalWeeks} · {program.workoutsDone} of {program.workoutsTotal}{' '}
            workouts done
          </p>
        </div>
        <Link
          href={programDetailHref(program.programId)}
          aria-label={`View ${program.programName}`}
          className="shrink-0 text-sm font-bold uppercase tracking-wider text-primary hover:text-primary-hover doom-link"
        >
          View
        </Link>
      </div>
      <div
        role="progressbar"
        aria-label="Program progress"
        aria-valuemin={0}
        aria-valuemax={program.workoutsTotal}
        aria-valuenow={program.workoutsDone}
        className="mt-2.5 h-2 w-full bg-muted overflow-hidden"
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      {upNext && (
        <p className="mt-2.5 text-sm text-muted-foreground">
          Next: Week {upNext.weekNumber} · Day {upNext.dayNumber} · {upNext.workoutName}
        </p>
      )}
    </div>
  )
}
