'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type StrengthActivationModalProps = {
  programId: string
  existingActiveProgram?: { id: string; name: string } | null
  onClose: () => void
}

export default function StrengthActivationModal({
  programId,
  existingActiveProgram,
  onClose
}: StrengthActivationModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivateProgram = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/activate`, {
        method: 'POST'
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to activate program')
      }

      // Redirect to training page to see the active program
      router.push('/training')
      router.refresh()
    } catch (err) {
      console.error('Error activating program:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate program')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipActivation = () => {
    // Redirect to programs list
    router.push('/programs?tab=strength')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-primary p-6 max-w-md w-full doom-noise doom-card shadow-2xl">
        <h3 className="text-2xl font-bold text-foreground doom-heading mb-4">
          ACTIVATE PROGRAM?
        </h3>

        <p className="text-muted-foreground mb-4">
          Would you like to make this your active strength program?
        </p>

        {existingActiveProgram && (
          <div className="bg-warning-muted border border-warning-border p-3 mb-4">
            <p className="text-sm text-warning-text">
              <span className="font-semibold">Warning:</span> This will replace your current active program: <span className="font-bold">{existingActiveProgram.name}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-error-muted border border-error-border p-3 mb-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSkipActivation}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border-2 border-border text-foreground hover:bg-muted disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
          >
            NO, KEEP INACTIVE
          </button>
          <button
            onClick={handleActivateProgram}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
          >
            {isLoading ? 'ACTIVATING...' : 'YES, ACTIVATE'}
          </button>
        </div>
      </div>
    </div>
  )
}
