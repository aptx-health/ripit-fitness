'use client'

import { Bookmark, BookmarkCheck, ChevronLeft, MessageSquarePlus, TrendingDown, TrendingUp, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { buildSuggestedSavedWorkoutName } from '@/lib/saved-workouts/suggest-name'
import type { RollupExercise, WorkoutRollup } from '@/lib/stats/workout-rollup'
import { POST_SESSION_REFINEMENTS } from '@/types/feedback'

interface WorkoutRollupModalProps {
  open: boolean
  rollup: WorkoutRollup | null
  onClose: () => void
}

type View = 'stats' | 'feedback' | 'save'

const MAX_SAVED_NAME_LENGTH = 200
const MAX_SAVED_NOTES_LENGTH = 2000

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function formatVolume(lbs: number): string {
  if (lbs >= 10_000) return `${(lbs / 1000).toFixed(1)}k`
  return Math.round(lbs).toLocaleString()
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? weight.toString() : weight.toFixed(1)
}

function ExerciseRow({ ex }: { ex: RollupExercise }) {
  const vs = ex.vsLastTime
  let trend: 'up' | 'down' | 'flat' | null = null
  let trendLabel = ''

  if (vs && !ex.isBodyweight && vs.previousVolumeLbs > 0) {
    const delta = ex.volumeLbs - vs.previousVolumeLbs
    const pct = Math.round((delta / vs.previousVolumeLbs) * 100)
    if (pct > 0) {
      trend = 'up'
      trendLabel = `+${pct}% vs last`
    } else if (pct < 0) {
      trend = 'down'
      trendLabel = `${pct}% vs last`
    } else {
      trend = 'flat'
      trendLabel = 'same as last'
    }
  } else if (vs && ex.isBodyweight) {
    const prevReps = vs.previousTopSet?.reps ?? 0
    if (prevReps && ex.reps !== prevReps) {
      const delta = ex.reps - prevReps
      trend = delta > 0 ? 'up' : 'down'
      trendLabel = `${delta > 0 ? '+' : ''}${delta} reps vs last`
    }
  }

  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-semibold text-foreground text-base truncate">{ex.name}</div>
        {ex.topSet && !ex.isBodyweight && (
          <div className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
            top {formatWeight(ex.topSet.weight)} × {ex.topSet.reps}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 mt-1.5 text-sm tabular-nums">
        <span className="text-muted-foreground">
          {ex.workingSets} set{ex.workingSets !== 1 ? 's' : ''} · {ex.reps} rep{ex.reps !== 1 ? 's' : ''}
          {!ex.isBodyweight && (
            <>
              {' · '}
              <span className="text-foreground font-semibold">{formatVolume(ex.volumeLbs)} lbs</span>
            </>
          )}
        </span>
        {trend && (
          <span
            className={`flex items-center gap-1 font-semibold uppercase tracking-wider text-sm ${
              trend === 'up' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}

type Tile = { label: string; value: string; tone?: 'default' | 'hero' }

function StatTile({ label, value, tone = 'default' }: Tile) {
  const isHero = tone === 'hero'
  return (
    <div
      className={`border-2 border-border bg-muted flex flex-col items-center justify-center ${
        isHero ? 'p-4 col-span-2' : 'p-3'
      }`}
    >
      <div
        className={`font-bold text-foreground doom-heading tabular-nums ${
          isHero ? 'text-3xl' : 'text-2xl'
        }`}
      >
        {value}
      </div>
      <div className="text-sm uppercase tracking-wider text-muted-foreground mt-1.5">
        {label}
      </div>
    </div>
  )
}

export function WorkoutRollupModal({ open, rollup, onClose }: WorkoutRollupModalProps) {
  const [view, setView] = useState<View>('stats')
  const [rating, setRating] = useState<number | null>(null)
  const [selectedRefinements, setSelectedRefinements] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [scope, setScope] = useState<'app' | 'workout'>('app')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)
  const [savedName, setSavedName] = useState('')
  const [savedNotes, setSavedNotes] = useState('')
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null)

  const suggestedName = useMemo(() => {
    if (!rollup) return ''
    return buildSuggestedSavedWorkoutName(rollup.exercises.map((e) => e.name))
  }, [rollup])

  const canSave = Boolean(
    rollup && rollup.isAdHoc && !rollup.isMinimal && rollup.exercises.length > 0
  )

  useEffect(() => {
    if (open) {
      setView('stats')
      setRating(null)
      setSelectedRefinements([])
      setMessage('')
      setScope('app')
      setSubmitting(false)
      setSubmitted(false)
      setSavedName('')
      setSavedNotes('')
      setSaveSubmitting(false)
      setSaveError(null)
      setSavedWorkoutId(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Show a bottom fade when there's more scrollable content below the fold.
  // Re-measure on view change, content change, scroll, and viewport resize.
  useLayoutEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return

    const measure = () => {
      const more = el.scrollHeight - el.scrollTop - el.clientHeight > 4
      setShowBottomFade(more)
    }

    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [open, view, submitted, rating, scope])

  if (!open || !rollup) return null

  // Build stat tiles. Hero is volume if non-zero, else total reps (bodyweight day).
  const heroTile: Tile | null = (() => {
    if (rollup.isMinimal) return null
    if (rollup.totalVolumeLbs > 0) {
      return { label: 'Volume (lbs)', value: formatVolume(rollup.totalVolumeLbs), tone: 'hero' }
    }
    if (rollup.totalReps > 0) {
      return { label: 'Total Reps', value: rollup.totalReps.toLocaleString(), tone: 'hero' }
    }
    return null
  })()

  const secondaryTiles: Tile[] = []
  if (!rollup.isMinimal) {
    if (rollup.totalVolumeLbs > 0) {
      // Volume was the hero; reps still earns a secondary tile.
      secondaryTiles.push({ label: 'Reps', value: rollup.totalReps.toLocaleString() })
    }
    secondaryTiles.push({ label: 'Working Sets', value: rollup.workingSetCount.toString() })
    secondaryTiles.push({ label: 'Exercises', value: rollup.exerciseCount.toString() })
    if (rollup.durationSeconds !== null) {
      secondaryTiles.push({ label: 'Duration', value: formatDuration(rollup.durationSeconds) })
    }
  }

  const toggleRefinement = (value: string) => {
    setSelectedRefinements((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    )
  }

  const submitFeedback = async (
    ratingValue: number,
    refinements: string[] = [],
    comment = ''
  ) => {
    setSubmitting(true)
    try {
      const properties: Record<string, string> = {
        completionId: rollup.completionId,
        scope,
      }
      if (scope === 'workout' && rollup.workoutId) {
        properties.workoutId = rollup.workoutId
        if (rollup.workoutName) properties.workoutName = rollup.workoutName
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'post_session',
          rating: ratingValue,
          refinements,
          message: comment.trim() || undefined,
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
          properties,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        clientLogger.error('Failed to submit post-session feedback')
      }
    } catch (err) {
      clientLogger.error('Error submitting post-session feedback:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRatingTap = (value: number) => {
    setRating(value)
    if (value === 5 && scope === 'app') {
      submitFeedback(value)
    }
  }

  const handleFeedbackSubmit = () => {
    if (!rating) return
    submitFeedback(rating, selectedRefinements, message)
  }

  const handleOpenSave = () => {
    setSavedName(suggestedName)
    setSavedNotes('')
    setSaveError(null)
    setView('save')
  }

  const handleSaveSubmit = async () => {
    if (!rollup) return
    const trimmedName = savedName.trim()
    if (!trimmedName) {
      setSaveError('Name is required')
      return
    }
    setSaveSubmitting(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/workouts/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCompletionId: rollup.completionId,
          name: trimmedName,
          notes: savedNotes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setSaveError(data.error || 'Failed to save workout')
        return
      }
      const data = (await res.json()) as { savedWorkout?: { id: string } }
      if (data.savedWorkout?.id) {
        setSavedWorkoutId(data.savedWorkout.id)
        setView('stats')
      } else {
        setSaveError('Failed to save workout')
      }
    } catch (err) {
      clientLogger.error('Error saving workout from completion:', err)
      setSaveError('Failed to save workout')
    } finally {
      setSaveSubmitting(false)
    }
  }

  const headerTitle =
    view === 'stats'
      ? 'Workout Complete'
      : view === 'save'
        ? 'Save Workout'
        : submitted
          ? 'Thanks!'
          : 'Quick Feedback'

  return (
    <div
      role="button"
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="flex items-center justify-center backdrop-blur-md bg-black/40 dark:bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      aria-label="Close workout summary"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: presentation wrapper stops click propagation */}
      <div
        role="presentation"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxHeight: 'calc(100dvh - 2rem)' }}
        className="relative w-full max-w-md bg-card border-2 border-border doom-corners doom-noise flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b-2 border-border flex items-center justify-between gap-2">
          {(view === 'save' || (view === 'feedback' && !submitted)) ? (
            <button
              type="button"
              onClick={() => setView('stats')}
              className="h-9 w-9 flex items-center justify-center border-2 border-border bg-muted hover:bg-secondary/10 transition-colors focus:outline-none doom-focus-ring"
              aria-label="Back to summary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="w-9" aria-hidden />
          )}
          <h2 className="flex-1 text-base font-bold text-foreground doom-heading uppercase tracking-[0.15em] text-center">
            {headerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center border-2 border-border bg-muted hover:bg-secondary/10 transition-colors focus:outline-none doom-focus-ring"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body with bottom fade when content overflows */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          {view === 'stats' && (
            <div className="px-5 py-5 space-y-5">
              {/* Compact meta row: lifetime + 7-day count */}
              <div className="flex items-stretch justify-between gap-3 text-foreground border-b-2 border-border/50 pb-4">
                <div className="flex-1">
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">
                    Workout
                  </div>
                  <div className="text-3xl font-bold doom-heading tabular-nums leading-none mt-1">
                    #{rollup.lifetimeWorkoutCount}
                  </div>
                </div>
                <div className="w-px bg-border/60" aria-hidden />
                <div className="flex-1 text-right">
                  <div className="text-sm uppercase tracking-wider text-muted-foreground">
                    Last 7 Days
                  </div>
                  <div className="text-3xl font-bold doom-heading tabular-nums leading-none mt-1">
                    {rollup.workoutsLast7Days}
                  </div>
                </div>
              </div>

              {/* Hero stat + 2x2 secondary grid */}
              {heroTile && (
                <div className="grid grid-cols-2 gap-2">
                  <StatTile {...heroTile} />
                  {secondaryTiles.map((t) => (
                    <StatTile key={t.label} label={t.label} value={t.value} />
                  ))}
                </div>
              )}

              {rollup.exercises.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Exercises
                  </p>
                  <div>
                    {rollup.exercises.map((ex) => (
                      <ExerciseRow key={ex.exerciseDefinitionId} ex={ex} />
                    ))}
                  </div>
                </div>
              )}

              {rollup.isMinimal && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Marked complete. Nice work.
                </p>
              )}
            </div>
          )}

          {view === 'feedback' && submitted && (
            <p className="px-5 py-10 text-base text-foreground text-center">
              Thanks for the feedback.
            </p>
          )}

          {view === 'save' && (
            <div className="px-5 py-5 space-y-5">
              <div>
                <label
                  htmlFor="rollup-save-name"
                  className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wider"
                >
                  Name
                </label>
                <input
                  id="rollup-save-name"
                  type="text"
                  value={savedName}
                  onChange={(e) => setSavedName(e.target.value)}
                  maxLength={MAX_SAVED_NAME_LENGTH}
                  placeholder="WORKOUT NAME"
                  className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-base placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-wider placeholder:text-xs focus:outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Default suggested from your top exercises — rename freely.
                </p>
              </div>
              <div>
                <label
                  htmlFor="rollup-save-notes"
                  className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wider"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="rollup-save-notes"
                  value={savedNotes}
                  onChange={(e) => setSavedNotes(e.target.value)}
                  rows={3}
                  maxLength={MAX_SAVED_NOTES_LENGTH}
                  placeholder="ANY CONTEXT YOU WANT TO REMEMBER"
                  className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-sm placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-wider placeholder:text-xs resize-none focus:outline-none focus:border-primary"
                />
              </div>
              {saveError && (
                <p className="text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              )}
            </div>
          )}

          {view === 'feedback' && !submitted && (
            <div className="px-5 py-5 space-y-5">
              {/* Scope toggle (community-sourced workouts only) */}
              {rollup.isCommunitySourced && rollup.workoutId && (
                <div>
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                    Feedback about
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScope('app')}
                      className={`py-3 border-2 text-sm font-semibold uppercase tracking-wider transition-colors doom-focus-ring ${
                        scope === 'app'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:bg-secondary/10'
                      }`}
                    >
                      The app
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('workout')}
                      className={`py-3 border-2 text-sm font-semibold uppercase tracking-wider transition-colors doom-focus-ring ${
                        scope === 'workout'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:bg-secondary/10'
                      }`}
                    >
                      This workout
                    </button>
                  </div>
                </div>
              )}

              {/* Rating */}
              <div>
                <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                  {scope === 'workout' ? 'How was this workout?' : 'How are you liking the app?'}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingTap(value)}
                      disabled={submitting}
                      className={`h-11 border-2 text-base font-bold tabular-nums transition-colors doom-focus-ring ${
                        rating === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:bg-secondary/10'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refinement chips: 2-column grid (app scope, rating < 5) */}
              {scope === 'app' && rating !== null && rating < 5 && (
                <div>
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                    What could be better?
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POST_SESSION_REFINEMENTS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRefinement(value)}
                        disabled={submitting}
                        className={`px-3 py-2.5 border-2 text-sm font-semibold text-left transition-colors doom-focus-ring ${
                          selectedRefinements.includes(value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-foreground border-border hover:bg-secondary/10'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional comment */}
              {rating !== null && (
                <div>
                  <label
                    htmlFor="rollup-feedback-comment"
                    className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wider"
                  >
                    {scope === 'workout' ? 'What about it? (optional)' : 'Anything specific? (optional)'}
                  </label>
                  <textarea
                    id="rollup-feedback-comment"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="TYPE ANYTHING"
                    className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-sm placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-wider placeholder:text-xs resize-none focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>
          )}
          {/* Sticky fade pinned to the bottom of the scroll viewport. Negative margin
              cancels its layout contribution so scrollHeight stays accurate. */}
          <div
            aria-hidden
            className={`sticky bottom-0 -mt-10 h-10 pointer-events-none bg-gradient-to-t from-card to-transparent transition-opacity duration-200 ${
              showBottomFade ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t-2 border-border flex items-center gap-3">
          {view === 'stats' && (
            <>
              <button
                type="button"
                onClick={() => setView('feedback')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Got feedback?
              </button>
              {canSave && (
                savedWorkoutId ? (
                  <Link
                    href="/workouts/saved"
                    className="ml-auto flex items-center gap-2 px-4 py-2.5 border-2 border-border bg-muted text-sm font-bold uppercase tracking-wider doom-focus-ring"
                  >
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                    Saved
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenSave}
                    className="ml-auto flex items-center gap-2 px-4 py-2.5 border-2 border-border bg-muted hover:bg-secondary/10 text-sm font-bold uppercase tracking-wider doom-focus-ring"
                  >
                    <Bookmark className="w-4 h-4" />
                    Save
                  </button>
                )
              )}
              <button
                type="button"
                onClick={onClose}
                className={`${canSave ? '' : 'ml-auto'} px-6 py-3 bg-primary text-primary-foreground doom-button-3d font-bold text-base uppercase tracking-wider doom-focus-ring`}
              >
                Done
              </button>
            </>
          )}

          {view === 'save' && (
            <>
              <button
                type="button"
                onClick={() => setView('stats')}
                className="px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubmit}
                disabled={saveSubmitting || savedName.trim().length === 0}
                className="ml-auto px-6 py-3 bg-primary text-primary-foreground doom-button-3d font-bold text-sm uppercase tracking-wider doom-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveSubmitting ? 'Saving…' : 'Save'}
              </button>
            </>
          )}

          {view === 'feedback' && !submitted && (
            <>
              <button
                type="button"
                onClick={() => setView('stats')}
                className="px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFeedbackSubmit}
                disabled={submitting || rating === null}
                className="ml-auto px-6 py-3 bg-primary text-primary-foreground doom-button-3d font-bold text-sm uppercase tracking-wider doom-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </>
          )}

          {view === 'feedback' && submitted && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-6 py-3 bg-primary text-primary-foreground doom-button-3d font-bold text-base uppercase tracking-wider doom-focus-ring"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
