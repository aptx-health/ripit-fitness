'use client'

import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'

type DeleteExerciseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: string
  exerciseName: string
  isSystem: boolean
  usageCount: number
  onSuccess?: () => void
}

export default function DeleteExerciseDialog({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  isSystem,
  usageCount,
  onSuccess,
}: DeleteExerciseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const requiresConfirmation = usageCount > 0

  const handleDelete = async () => {
    if (requiresConfirmation && !confirmed) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const url = usageCount > 0
        ? `/api/admin/exercise-definitions/${exerciseId}?force=true`
        : `/api/admin/exercise-definitions/${exerciseId}`

      const response = await fetch(url, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete exercise')
      }

      onOpenChange(false)
      setConfirmed(false)
      onSuccess?.()
    } catch (err) {
      console.error('Error deleting exercise:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete exercise')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
      setConfirmed(false)
    }
    onOpenChange(newOpen)
  }

  const canDelete = !requiresConfirmation || confirmed

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="backdrop-blur-md bg-black/40 dark:bg-black/60"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        />
        <AlertDialog.Content
          className="bg-card border-2 border-error shadow-xl w-full max-w-md p-6 doom-corners"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 51,
          }}
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-error/10 border-2 border-error mb-4">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>

          {/* Title */}
          <AlertDialog.Title className="text-xl font-bold text-foreground mb-2 uppercase tracking-wider">
            Delete Exercise?
          </AlertDialog.Title>

          {/* Description */}
          <AlertDialog.Description asChild>
            <div className="text-sm text-muted-foreground mb-4">
              <p className="mb-2">
                This will permanently delete{' '}
                <span className="font-medium text-foreground">"{exerciseName}"</span>.
              </p>

              {isSystem && (
                <div className="p-3 bg-warning-muted border-2 border-warning-border mb-3">
                  <p className="text-sm text-warning-text font-medium">
                    This is a system exercise. Deleting it may affect other users.
                  </p>
                </div>
              )}

              {usageCount > 0 && (
                <div className="p-3 bg-error/10 border-2 border-error mb-3">
                  <p className="text-sm text-error font-medium">
                    This exercise is used {usageCount} time{usageCount > 1 ? 's' : ''} in
                    workouts. Deleting it will remove the exercise definition, but existing
                    workout data referencing it may be affected.
                  </p>
                </div>
              )}
            </div>
          </AlertDialog.Description>

          {/* Confirmation checkbox for exercises in use */}
          {requiresConfirmation && (
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 border-2 border-border rounded cursor-pointer"
              />
              <span className="text-sm text-foreground">
                I understand this exercise is in use and want to delete it anyway
              </span>
            </label>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-error/10 border-2 border-error">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <AlertDialog.Cancel asChild>
              <button
                disabled={isDeleting}
                className="px-4 py-2 border-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-semibold text-sm doom-focus-ring"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              onClick={handleDelete}
              disabled={isDeleting || !canDelete}
              className="px-4 py-2 bg-error text-error-foreground hover:bg-error-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-semibold text-sm doom-button-3d doom-focus-ring"
            >
              {isDeleting ? 'DELETING...' : 'DELETE'}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
