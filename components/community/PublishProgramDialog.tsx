'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { LoadingFrog } from '@/components/ui/loading-frog'

type PublishProgramDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  programId: string
  programName: string
}

type ValidationResult = {
  valid: boolean
  errors: string[]
  stats?: {
    weekCount: number
    workoutCount: number
    exerciseCount: number
  }
  displayName?: string
}

type PublishState = 'validating' | 'invalid' | 'ready' | 'publishing' | 'success'

export default function PublishProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
}: PublishProgramDialogProps) {
  const router = useRouter()
  const [state, setState] = useState<PublishState>('validating')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setState('validating')
      setValidationResult(null)
      setError(null)
      validateProgram()
    }
  }, [open, programId])

  const validateProgram = async () => {
    try {
      const response = await fetch(`/api/programs/${programId}/validate-publish`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to validate program')
      }

      const result: ValidationResult = await response.json()
      setValidationResult(result)
      setState(result.valid ? 'ready' : 'invalid')
    } catch (err) {
      console.error('Error validating program:', err)
      setError(err instanceof Error ? err.message : 'Failed to validate program')
      setState('invalid')
    }
  }

  const handlePublish = async () => {
    setState('publishing')
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/publish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish program')
      }

      setState('success')
    } catch (err) {
      console.error('Error publishing program:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish program')
      setState('ready')
    }
  }

  const handleClose = () => {
    if (state === 'success') {
      // Refresh the page to update the UI
      router.refresh()
    }
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border-2 border-border shadow-xl z-50 w-full max-w-md p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto doom-corners">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold text-foreground uppercase tracking-wider">
              Publish to Community
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors doom-focus-ring"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Content based on state */}
          {state === 'validating' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <LoadingFrog size={64} speed={0.6} />
              </div>
              <p className="text-sm text-muted-foreground">Validating program...</p>
            </div>
          )}

          {state === 'publishing' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <LoadingFrog size={64} speed={0.6} />
              </div>
              <p className="text-sm text-muted-foreground">Publishing to community...</p>
            </div>
          )}

          {state === 'invalid' && (
            <>
              <div className="flex items-center gap-3 mb-4 p-4 bg-error/10 border-2 border-error">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-error mb-1 uppercase tracking-wider">Cannot Publish Program</p>
                  <p className="text-xs text-error/80">
                    Your program needs the following to be published:
                  </p>
                </div>
              </div>

              {validationResult?.errors && validationResult.errors.length > 0 && (
                <ul className="space-y-2 mb-6">
                  {validationResult.errors.map((err, index) => (
                    <li key={index} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-error mt-0.5">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="mb-4 p-3 bg-error/10 border-2 border-error">
                  <p className="text-sm text-error font-medium">{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors uppercase tracking-wider font-semibold text-sm doom-focus-ring"
                >
                  Close
                </button>
              </div>
            </>
          )}

          {state === 'ready' && validationResult && (
            <>
              {/* Program Summary */}
              <div className="mb-6">
                <h3 className="font-bold text-foreground mb-2 uppercase tracking-wide">{programName}</h3>
                {validationResult.stats && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{validationResult.stats.weekCount} weeks</span>
                    <span>•</span>
                    <span>{validationResult.stats.workoutCount} workouts</span>
                    <span>•</span>
                    <span>{validationResult.stats.exerciseCount} exercises</span>
                  </div>
                )}
              </div>

              {/* Display Name Info */}
              <div className="mb-6 p-4 bg-muted border-2 border-border">
                <p className="text-sm text-foreground mb-1">
                  <span className="font-semibold uppercase tracking-wider text-xs">Published as:</span>{' '}
                  {validationResult.displayName || 'Anonymous User'}
                </p>
                {!validationResult.displayName && (
                  <p className="text-xs text-muted-foreground mt-2">
                    You haven't set a display name. You can set one in your user settings.
                  </p>
                )}
              </div>

              {/* Important Note */}
              <div className="mb-6 p-4 bg-primary/10 border-2 border-primary/30">
                <p className="text-xs text-foreground/80">
                  <span className="font-semibold uppercase tracking-wider">Note:</span> Once published, programs are immutable and
                  shared publicly. You can unpublish later, but cannot edit published programs.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-error/10 border-2 border-error">
                  <p className="text-sm text-error font-medium">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors uppercase tracking-wider font-semibold text-sm doom-focus-ring"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center gap-2 uppercase tracking-wider font-semibold text-sm doom-button-3d doom-focus-ring"
                >
                  <Upload className="w-4 h-4" />
                  Publish
                </button>
              </div>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 bg-success/20 border-2 border-success mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wider">Program Published!</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  "{programName}" is now available in the community library.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors uppercase tracking-wider font-semibold text-sm doom-focus-ring"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => router.push('/community')}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors uppercase tracking-wider font-semibold text-sm doom-button-3d doom-focus-ring"
                  >
                    View in Community
                  </button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
