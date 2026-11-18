'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { pluralize } from '@/lib/format/pluralize'

type Props = {
  count: number
  onConfirm: () => void
  onClose: () => void
}

/** Select mode's Delete confirm. The list deletes (bulk delete); sessions done from them stay. */
export default function BulkDeleteDialog({ count, onConfirm, onClose }: Props) {
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="bg-background/70 backdrop-blur-md" style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
        <AlertDialog.Content
          className="doom-corners w-[calc(100vw-2rem)] max-w-md border-2 border-error bg-card p-6 shadow-xl"
          style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 51 }}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-error bg-error/10">
            <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
          </div>
          <AlertDialog.Title className="mb-2 text-xl font-bold uppercase tracking-wider text-foreground">
            Delete {pluralize(count, 'workout')}?
          </AlertDialog.Title>{' '}
          <AlertDialog.Description className="mb-4 text-base text-muted-foreground">
            Your workout history stays.
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="doom-focus-ring min-h-12 border-2 border-border px-4 py-2 text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className="doom-focus-ring min-h-12 bg-error px-4 py-2 text-sm font-semibold uppercase tracking-wider text-error-foreground transition-colors hover:bg-error-hover"
              >
                Delete
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
