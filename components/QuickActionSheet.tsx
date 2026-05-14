'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ChevronRight,
  Dumbbell,
  LayoutGrid,
  Play,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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
  const { activeDraft } = useDraftWorkout()
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isStartingFreestyle, setIsStartingFreestyle] = useState(false)

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
            className="bg-card border border-border doom-corners divide-y divide-border"
            style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.35)' }}
          >
            {/* Header — same cream surface as rows; close as a chunky bordered chip */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5">
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
              <ActionRow
                icon={Play}
                label={activeDraft.workoutName}
                subtitle={
                  activeDraft.isAdHoc
                    ? 'Resume freestyle workout'
                    : 'Resume in-progress workout'
                }
                onClick={handleResumeDraft}
                primary
              />
            ) : (
              <ActionRow
                icon={Play}
                label="Continue your program"
                subtitle={continueSubtitle}
                onClick={nextWorkout ? handleContinueProgram : undefined}
                disabled={!nextWorkout}
                primary={!!nextWorkout}
              />
            )}

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
              subtitle={activeDraft ? 'Finish current workout first' : 'Coming soon'}
              disabled
            />
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
  primary?: boolean
}

function ActionRow({
  icon: Icon,
  label,
  subtitle,
  onClick,
  disabled = false,
  primary = false,
}: ActionRowProps) {
  const isPrimary = primary && !disabled
  const baseStyles =
    'group w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors doom-focus-ring'
  const enabledStyles = 'hover:bg-muted/50 active:bg-muted/70 cursor-pointer'
  const disabledStyles = 'opacity-50 cursor-not-allowed'

  // Icon chip: green-success tile for the primary action (echoes the bottom-nav
  // gold chip language), bordered cream tile for the rest.
  const chipStyles = isPrimary
    ? 'bg-success text-success-foreground border-success'
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
      {!disabled && (
        <ChevronRight
          size={20}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
            isPrimary ? 'text-success' : 'text-muted-foreground'
          }`}
        />
      )}
    </button>
  )
}
