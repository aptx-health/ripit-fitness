'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

type Props = {
  item: SavedWorkoutListItem
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function DeleteSavedWorkoutDialog({ item, onOpenChange, onSuccess }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/workouts/saved/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to delete')
      }
      onSuccess()
    } catch (err) {
      clientLogger.error('Failed to delete saved workout', err)
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <AlertDialog.Root open onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="backdrop-blur-md bg-black/40 dark:bg-black/60"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        />
        <AlertDialog.Content
          className="doom-corners w-[calc(100vw-2rem)] max-w-md border-2 border-error bg-card p-6 shadow-xl"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 51,
          }}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-error bg-error/10">
            <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
          </div>

          <AlertDialog.Title className="mb-2 text-xl font-bold uppercase tracking-wider text-foreground">
            Delete saved workout?
          </AlertDialog.Title>

          <AlertDialog.Description asChild>
            <div className="mb-4 text-sm text-muted-foreground">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">&quot;{item.name}&quot;</span>.
              Past completions that referenced it are not affected.
            </div>
          </AlertDialog.Description>

          {error && (
            <div className="mb-4 border-2 border-error bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={deleting}
                className="doom-focus-ring min-h-12 border-2 border-border px-4 py-2 text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="doom-focus-ring min-h-12 bg-error px-4 py-2 text-sm font-semibold uppercase tracking-wider text-error-foreground transition-colors hover:bg-error-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
