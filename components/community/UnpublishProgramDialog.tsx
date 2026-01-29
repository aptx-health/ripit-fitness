'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'

type UnpublishProgramDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  programId: string
  programName: string
}

export default function UnpublishProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
}: UnpublishProgramDialogProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnpublish = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/community/${programId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unpublish program')
      }

      // Close dialog and refresh page
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error('Error unpublishing program:', err)
      setError(err instanceof Error ? err.message : 'Failed to unpublish program')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 z-50 animate-in fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-error rounded-lg shadow-xl z-50 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mb-4">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>

          {/* Title */}
          <AlertDialog.Title className="text-xl font-bold text-foreground mb-2">
            Unpublish Program?
          </AlertDialog.Title>

          {/* Description */}
          <AlertDialog.Description className="text-sm text-muted-foreground mb-6">
            This will remove <span className="font-medium text-foreground">"{programName}"</span> from
            the community library. Users who have already added it will keep their copies, but no new
            users can add it.
          </AlertDialog.Description>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <AlertDialog.Cancel asChild>
              <button
                disabled={isDeleting}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={handleUnpublish}
                disabled={isDeleting}
                className="px-4 py-2 bg-error text-error-foreground rounded-lg hover:bg-error-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Unpublishing...' : 'Unpublish'}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
