'use client'

import { pluralize } from '@/lib/format/pluralize'
import LoggerConfirm from './LoggerConfirm'

type Props = {
  isFollowAlong: boolean
  isSubmitting: boolean
  /** Sets logged so far, across every exercise. */
  setCount: number
  /** Whole minutes since the workout started. */
  durationMinutes: number
  onCancel: () => void
  onConfirm: () => void
}

/** "Complete this workout?", with what will be saved: "18 sets · 42 min". */
export default function CompleteWorkoutConfirm({
  isFollowAlong,
  isSubmitting,
  setCount,
  durationMinutes,
  onCancel,
  onConfirm,
}: Props) {
  const body = isSubmitting
    ? 'Completing workout…'
    : isFollowAlong
      ? 'This saves the workout as done.'
      : `${pluralize(setCount, 'set')} · ${durationMinutes < 1 ? 'under 1 min' : `${durationMinutes} min`}`

  return (
    <LoggerConfirm
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title={isFollowAlong ? 'Nice work! Mark this workout as done?' : 'Complete this workout?'}
      body={body}
      confirmLabel={isFollowAlong ? 'Finish' : 'Confirm'}
      onConfirm={onConfirm}
      busy={isSubmitting}
    />
  )
}
