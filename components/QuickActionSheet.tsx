'use client'

import { Activity, Dumbbell, LayoutGrid, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
} from '@/components/ui/radix/dialog'
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

export default function QuickActionSheet({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { activeDraft } = useDraftWorkout()
  const [nextWorkout, setNextWorkout] = useState<NextWorkout | null>(null)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isStartingFreestyle, setIsStartingFreestyle] = useState(false)

  // Fetch next-workout only when the sheet opens AND no draft is active
  // (when a draft is active, only Resume Draft is enabled — next-workout doesn't matter).
  useEffect(() => {
    if (!open || activeDraft) {
      return
    }
    let cancelled = false
    setIsLoadingNext(true)
    fetch('/api/training/next-workout', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { next: null }))
      .then((data) => {
        if (cancelled) return
        setNextWorkout(data.next)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!w-[92vw] !max-w-md"
        showClose={true}
      >
        <DialogTitle className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 text-base font-bold uppercase tracking-wider text-foreground doom-heading">
          Quick actions
        </DialogTitle>
        <DialogBody className="px-3 sm:px-4 pb-4 sm:pb-5 space-y-2">
          {activeDraft ? (
            <>
              <ActionRow
                icon={Dumbbell}
                label={`Resume draft: ${activeDraft.workoutName}`}
                subtitle={
                  activeDraft.isAdHoc
                    ? 'Continue your freestyle workout'
                    : 'Continue your in-progress workout'
                }
                onClick={handleResumeDraft}
                emphasis="primary"
              />
              <ActionRow
                icon={Dumbbell}
                label="Freestyle workout"
                subtitle="Finish current workout first"
                disabled
              />
              <ActionRow
                icon={LayoutGrid}
                label="Pick a workout"
                subtitle="Finish current workout first"
                disabled
              />
            </>
          ) : (
            <>
              <ActionRow
                icon={Activity}
                label={
                  nextWorkout
                    ? `Continue your program`
                    : 'Continue your program'
                }
                subtitle={
                  isLoadingNext
                    ? 'Loading…'
                    : nextWorkout
                      ? `${nextWorkout.programName} — Week ${nextWorkout.weekNumber}, ${nextWorkout.workoutName}`
                      : 'No active program'
                }
                onClick={nextWorkout ? handleContinueProgram : undefined}
                disabled={!nextWorkout}
                emphasis={nextWorkout ? 'primary' : undefined}
              />
              <ActionRow
                icon={Dumbbell}
                label="Freestyle workout"
                subtitle={
                  isStartingFreestyle ? 'Starting…' : 'Log sets as you go'
                }
                onClick={handleStartFreestyle}
                disabled={isStartingFreestyle}
              />
              <ActionRow
                icon={LayoutGrid}
                label="Pick a workout"
                subtitle="Coming soon"
                disabled
              />
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

type ActionRowProps = {
  icon: LucideIcon
  label: string
  subtitle?: string
  onClick?: () => void
  disabled?: boolean
  emphasis?: 'primary'
}

function ActionRow({
  icon: Icon,
  label,
  subtitle,
  onClick,
  disabled = false,
  emphasis,
}: ActionRowProps) {
  const baseStyles =
    'w-full flex items-center gap-3 px-3 py-3 text-left border-2 transition-colors doom-focus-ring'
  const enabledStyles =
    emphasis === 'primary'
      ? 'border-accent bg-accent/5 hover:bg-accent/10 active:bg-accent/15 text-foreground'
      : 'border-border bg-card hover:bg-muted active:bg-muted/80 text-foreground'
  const disabledStyles =
    'border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${disabled ? disabledStyles : enabledStyles}`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          disabled ? 'text-muted-foreground' : emphasis === 'primary' ? 'text-accent' : 'text-foreground'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm uppercase tracking-wider truncate">
          {label}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </button>
  )
}
