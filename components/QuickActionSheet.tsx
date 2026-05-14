'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Dumbbell,
  LayoutGrid,
  type LucideIcon,
  Play,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset the inline-confirm state whenever the sheet closes or the draft
  // clears, so the trash button never reopens still armed.
  useEffect(() => {
    if (!open || !activeDraft) {
      setConfirmDiscard(false)
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current)
        confirmTimerRef.current = null
      }
    }
  }, [open, activeDraft])

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [])

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
      router.refresh()
    } catch (err) {
      clientLogger.error('Failed to discard draft:', err)
    } finally {
      setIsDiscardingDraft(false)
    }
  }, [activeDraft, isDiscardingDraft, clearDraft, refreshDraft, router])

  // Two-stage inline confirm: first tap arms (button turns red + label), second
  // tap within ~4s discards. Any sheet close or draft change resets it.
  const handleDiscardClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!activeDraft || isDiscardingDraft) return
      if (confirmDiscard) {
        if (confirmTimerRef.current) {
          clearTimeout(confirmTimerRef.current)
          confirmTimerRef.current = null
        }
        setConfirmDiscard(false)
        void handleDiscardDraft()
        return
      }
      setConfirmDiscard(true)
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => {
        setConfirmDiscard(false)
        confirmTimerRef.current = null
      }, 4000)
    },
    [activeDraft, isDiscardingDraft, confirmDiscard, handleDiscardDraft],
  )

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

            {activeDraft ? (
              <>
                {/* Draft row: tap the body to resume, tap the trailing trash
                    chip to arm + confirm discard inline. */}
                <div className="flex items-stretch bg-accent/10">
                  <button
                    type="button"
                    onClick={handleResumeDraft}
                    className="group flex-1 flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/15 active:bg-accent/25 transition-colors doom-focus-ring min-w-0"
                  >
                    <span className="inline-flex items-center justify-center w-10 h-10 border border-accent bg-accent text-accent-foreground shrink-0">
                      <Play size={20} strokeWidth={2.25} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-foreground doom-heading truncate">
                        {activeDraft.isAdHoc
                          ? 'Freestyle workout'
                          : activeDraft.workoutName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate mt-0.5">
                        In progress · tap to resume
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardClick}
                    disabled={isDiscardingDraft}
                    aria-label={
                      confirmDiscard ? 'Confirm discard draft' : 'Discard draft'
                    }
                    className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 my-2 mr-3 border transition-colors doom-focus-ring disabled:opacity-50 ${
                      confirmDiscard
                        ? 'bg-error text-error-foreground border-error'
                        : 'bg-card hover:bg-error/15 hover:border-error/60 hover:text-error text-foreground/70 border-border'
                    }`}
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                    {confirmDiscard && (
                      <span className="text-xs font-black uppercase tracking-wider">
                        {isDiscardingDraft ? 'Discarding' : 'Confirm'}
                      </span>
                    )}
                  </button>
                </div>

                {/* Single explanatory line replacing three rows of identical
                    "finish current workout first" denial. */}
                <div className="px-4 py-3 text-center text-xs text-muted-foreground italic border-t border-border">
                  Continue or discard your draft to unlock other actions
                </div>
              </>
            ) : (
              <div className="divide-y divide-border">
                <ActionRow
                  icon={Play}
                  label="Continue your program"
                  subtitle={continueSubtitle}
                  onClick={nextWorkout ? handleContinueProgram : undefined}
                  disabled={!nextWorkout}
                  tone={nextWorkout ? 'success' : undefined}
                />
                <ActionRow
                  icon={Dumbbell}
                  label="Freestyle workout"
                  subtitle={
                    isStartingFreestyle ? 'Starting…' : 'Log sets as you go'
                  }
                  onClick={!isStartingFreestyle ? handleStartFreestyle : undefined}
                  disabled={isStartingFreestyle}
                />
                <ActionRow
                  icon={LayoutGrid}
                  label="Pick a workout"
                  subtitle="Coming soon"
                  disabled
                />
              </div>
            )}
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
  /** Color treatment for the icon chip. `success` for the "Continue your
   *  program" go-action; `accent` for the theme's brand voice. */
  tone?: 'success' | 'accent'
}

const TONE_CHIP_STYLES = {
  success: 'bg-success text-success-foreground border-success',
  accent: 'bg-accent text-accent-foreground border-accent',
} as const

function ActionRow({
  icon: Icon,
  label,
  subtitle,
  onClick,
  disabled = false,
  tone,
}: ActionRowProps) {
  const activeTone = !disabled && tone ? tone : null
  const baseStyles =
    'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors doom-focus-ring'
  const enabledStyles = 'hover:bg-muted/50 active:bg-muted/70 cursor-pointer'
  const disabledStyles = 'opacity-50 cursor-not-allowed'

  const chipStyles = activeTone
    ? TONE_CHIP_STYLES[activeTone]
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
    </button>
  )
}
