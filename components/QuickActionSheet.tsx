'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ChevronDown,
  ChevronRight,
  Dumbbell,
  LayoutGrid,
  type LucideIcon,
  Play,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { discardDraft } from '@/lib/api/workout-sets'
import { clientLogger } from '@/lib/client-logger'
import { useDraftWorkout } from '@/lib/contexts/DraftWorkoutContext'

type NextWorkout = {
  workoutId: string
  workoutName: string
  dayNumber: number
  weekNumber: number
  totalWeeks: number
  programName: string
  exerciseCount: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Bottom-anchored sheet sitting above the h-14 mobile bottom nav, with a small
// breathing gap so the nav's gold action chip doesn't kiss the panel border.
const NAV_OFFSET_PX = 56 + 8
const SHEET_BOTTOM_STYLE = {
  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_OFFSET_PX}px)`,
}

export default function QuickActionSheet({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { activeDraft, refreshDraft, clearDraft } = useDraftWorkout()
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isStartingFreestyle, setIsStartingFreestyle] = useState(false)
  const [isDraftExpanded, setIsDraftExpanded] = useState(false)
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false)

  // Collapse the draft section whenever the sheet closes (or the draft clears)
  useEffect(() => {
    if (!open || !activeDraft) setIsDraftExpanded(false)
  }, [open, activeDraft])

  // Re-fetch active draft each time the sheet opens — context only loads on
  // mount, so a draft saved elsewhere wouldn't otherwise show up here.
  useEffect(() => {
    if (open) refreshDraft()
  }, [open, refreshDraft])

  useEffect(() => {
    if (!open || activeDraft) return
    let cancelled = false
    setIsLoadingNext(true)
    fetch('/api/training/next-workout', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { next: null }))
      .then((data) => {
        if (!cancelled) setNextWorkout(data.next)
      })
      .catch((err) => {
        clientLogger.error('Failed to load next workout:', err)
        if (!cancelled) setNextWorkout(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNext(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, activeDraft])

  const handleResumeDraft = useCallback(() => {
    if (!activeDraft) return
    onOpenChange(false)
    if (activeDraft.isAdHoc) {
      router.push(`/training/adhoc/${activeDraft.completionId}`)
    } else {
      router.push(`/training?resume=${activeDraft.workoutId}`)
    }
  }, [activeDraft, onOpenChange, router])

  const handleContinueProgram = useCallback(() => {
    if (!nextWorkout) return
    onOpenChange(false)
    router.push(`/training?resume=${nextWorkout.workoutId}`)
  }, [nextWorkout, onOpenChange, router])

  const handleStartFreestyle = useCallback(async () => {
    if (isStartingFreestyle) return
    setIsStartingFreestyle(true)
    try {
      const res = await fetch('/api/workouts/adhoc', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        clientLogger.error('Failed to start freestyle workout:', data)
        return
      }
      const data = await res.json()
      onOpenChange(false)
      router.push(`/training/adhoc/${data.completion.id}`)
    } catch (err) {
      clientLogger.error('Failed to start freestyle workout:', err)
    } finally {
      setIsStartingFreestyle(false)
    }
  }, [isStartingFreestyle, onOpenChange, router])

  const handleDiscardDraft = useCallback(async () => {
    if (!activeDraft || isDiscardingDraft) return
    setIsDiscardingDraft(true)
    try {
      if (activeDraft.isAdHoc) {
        await fetch(`/api/workouts/adhoc/${activeDraft.completionId}`, {
          method: 'DELETE',
        })
      } else if (activeDraft.workoutId) {
        await discardDraft(activeDraft.workoutId)
      }
      clearDraft()
      await refreshDraft()
      setIsDraftExpanded(false)
      router.refresh()
    } catch (err) {
      clientLogger.error('Failed to discard draft:', err)
    } finally {
      setIsDiscardingDraft(false)
    }
  }, [activeDraft, isDiscardingDraft, clearDraft, refreshDraft, router])

  const continueSubtitle = isLoadingNext
    ? 'Loading…'
    : nextWorkout
      ? `Week ${nextWorkout.weekNumber} · Day ${nextWorkout.dayNumber} · ${nextWorkout.workoutName}`
      : 'No active program'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=open]:duration-200 data-[state=closed]:duration-150"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(96vw, 28rem)',
            zIndex: 51,
            ...SHEET_BOTTOM_STYLE,
          }}
        >
          <div
            className="bg-card border border-border doom-corners"
            style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.35)' }}
          >
            {/* Header — same cream surface as rows; close as a chunky bordered chip */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-border">
              <DialogPrimitive.Title className="doom-label text-foreground/80">
                Quick actions
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="inline-flex items-center justify-center w-8 h-8 border border-border bg-muted/30 hover:bg-muted/60 active:bg-muted text-foreground/70 hover:text-foreground transition-colors doom-focus-ring"
              >
                <X size={16} strokeWidth={2.5} />
              </DialogPrimitive.Close>
            </div>

            {/* Draft section: appears above the main actions when a draft is in
                progress, separated by a thin border + spacing. Tapping the row
                expands it to reveal Continue + Discard controls inline. */}
            {activeDraft && (
              <>
                <div className="bg-warning/5">
                  <ActionRow
                    icon={Play}
                    label="Continue draft workout"
                    subtitle={
                      activeDraft.isAdHoc ? 'Freestyle' : activeDraft.workoutName
                    }
                    onClick={() => setIsDraftExpanded((v) => !v)}
                    tone="warning"
                    expanded={isDraftExpanded}
                  />
                  {isDraftExpanded && (
                    <div className="px-4 pb-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleResumeDraft}
                        className="flex-[1.4] h-10 bg-warning text-warning-foreground text-sm font-bold uppercase tracking-wider doom-button-3d-accent doom-focus-ring"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={handleDiscardDraft}
                        disabled={isDiscardingDraft}
                        className="flex-1 h-10 bg-error text-error-foreground text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 disabled:opacity-50 doom-focus-ring"
                        style={{
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)',
                        }}
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                        {isDiscardingDraft ? 'Discarding…' : 'Discard'}
                      </button>
                    </div>
                  )}
                </div>
                {/* Visual gap separating draft from the always-visible actions */}
                <div className="h-2 bg-card border-b border-border" />
              </>
            )}

            <div className="divide-y divide-border">
              <ActionRow
                icon={Play}
                label="Continue your program"
                subtitle={
                  activeDraft
                    ? 'Finish current workout first'
                    : continueSubtitle
                }
                onClick={
                  !activeDraft && nextWorkout ? handleContinueProgram : undefined
                }
                disabled={!!activeDraft || !nextWorkout}
                tone={!activeDraft && nextWorkout ? 'success' : undefined}
              />

              <ActionRow
                icon={Dumbbell}
                label="Freestyle workout"
                subtitle={
                  activeDraft
                    ? 'Finish current workout first'
                    : isStartingFreestyle
                      ? 'Starting…'
                      : 'Log sets as you go'
                }
                onClick={
                  !activeDraft && !isStartingFreestyle
                    ? handleStartFreestyle
                    : undefined
                }
                disabled={!!activeDraft || isStartingFreestyle}
              />

              <ActionRow
                icon={LayoutGrid}
                label="Pick a workout"
                subtitle={
                  activeDraft ? 'Finish current workout first' : 'Coming soon'
                }
                disabled
              />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type ActionRowProps = {
  icon: LucideIcon
  label: string
  subtitle?: string
  onClick?: () => void
  disabled?: boolean
  /** Color treatment for the icon chip + chevron. `success` (jungle green) for
   *  Continue your program; `warning` (banana gold) for the draft-resume row,
   *  echoing the bottom-nav gold chip's call-back to in-progress work. */
  tone?: 'success' | 'warning'
  /** When true, renders a down-chevron instead of right-chevron to indicate
   *  the row toggles an expanded section. */
  expanded?: boolean
}

const TONE_STYLES = {
  success: {
    chip: 'bg-success text-success-foreground border-success',
    chevron: 'text-success',
  },
  warning: {
    chip: 'bg-warning text-warning-foreground border-warning',
    chevron: 'text-warning',
  },
} as const

function ActionRow({
  icon: Icon,
  label,
  subtitle,
  onClick,
  disabled = false,
  tone,
  expanded = false,
}: ActionRowProps) {
  const activeTone = !disabled && tone ? tone : null
  const baseStyles =
    'group w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors doom-focus-ring'
  const enabledStyles = 'hover:bg-muted/50 active:bg-muted/70 cursor-pointer'
  const disabledStyles = 'opacity-50 cursor-not-allowed'

  const chipStyles = activeTone
    ? TONE_STYLES[activeTone].chip
    : disabled
      ? 'bg-muted/40 text-muted-foreground border-border'
      : 'bg-muted/30 text-foreground/80 border-border'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${disabled ? disabledStyles : enabledStyles}`}
    >
      <span
        className={`inline-flex items-center justify-center w-10 h-10 border ${chipStyles} shrink-0`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base text-foreground doom-heading truncate">
          {label}
        </div>
        {subtitle && (
          <div className="text-sm text-muted-foreground truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {!disabled &&
        (expanded ? (
          <ChevronDown
            size={20}
            strokeWidth={2.5}
            className={`shrink-0 transition-transform ${
              activeTone ? TONE_STYLES[activeTone].chevron : 'text-muted-foreground'
            }`}
          />
        ) : (
          <ChevronRight
            size={20}
            strokeWidth={2.5}
            className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
              activeTone ? TONE_STYLES[activeTone].chevron : 'text-muted-foreground'
            }`}
          />
        ))}
    </button>
  )
}
