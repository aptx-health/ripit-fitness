'use client'

import LoggerConfirm from './LoggerConfirm'

type Props = {
  onCancel: () => void
  onConfirm: () => void
}

/** Asked before deleting an exercise's only logged set. */
export default function DeleteSetConfirm({ onCancel, onConfirm }: Props) {
  return (
    <LoggerConfirm
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title="Delete the only set?"
      body="This removes the only logged set for this exercise."
      confirmLabel="Delete set"
      onConfirm={onConfirm}
      destructive
    />
  )
}
