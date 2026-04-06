'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'

type ActivationConfirmModalProps = {
  programId: string
  programName: string
  existingActiveProgram?: { id: string; name: string } | null
  onClose: () => void
}

type HistoryState =
  | { status: 'loading' }
  | { status: 'no_history' }
  | { status: 'has_history'; completionCount: number }
  | { status: 'error'; message: string }

export default function ActivationConfirmModal({
  programId,
  programName,
  existingActiveProgram,
  onClose,
}: ActivationConfirmModalProps) {
  const router = useRouter()
  const [historyState, setHistoryState] = useState<HistoryState>({ status: 'loading' })
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check workout history on mount
  useEffect(() => {
    const controller = new AbortController()

    const checkHistory = async () => {
      try {
        const response = await fetch(`/api/programs/${programId}/workout-history`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to check workout history')
        }

        const data = await response.json()

        if (data.hasHistory) {
          setHistoryState({ status: 'has_history', completionCount: data.completionCount })
        } else {
          setHistoryState({ status: 'no_history' })
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        clientLogger.error('Error checking workout history:', err)
        setHistoryState({ status: 'error', message: 'Failed to check workout history' })
      }
    }

    checkHistory()

    return () => controller.abort()
  }, [programId])

  const activateAndRedirect = useCallback(async () => {
    setActivating(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/activate`, {
        method: 'POST',
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to activate program')
      }

      router.push('/training')
      router.refresh()
      onClose()
    } catch (err) {
      clientLogger.error('Error activating program:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate program')
      setActivating(false)
    }
  }, [programId, router, onClose])

  // Auto-activate if no history and no active program conflict
  useEffect(() => {
    if (historyState.status === 'no_history' && !existingActiveProgram) {
      activateAndRedirect()
    }
  }, [historyState.status, existingActiveProgram, activateAndRedirect])

  const handleResetAndActivate = async () => {
    setActivating(true)
    setError(null)

    try {
      const restartResponse = await fetch(`/api/programs/${programId}/restart`, {
        method: 'POST',
      })

      if (!restartResponse.ok) {
        throw new Error('Failed to reset program')
      }

      const restartData = await restartResponse.json()
      clientLogger.info(`Archived ${restartData.archivedCompletions} completions before activation`)

      await activateAndRedirect()
    } catch (err) {
      clientLogger.error('Error resetting and activating program:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset program')
      setActivating(false)
    }
  }

  // Loading state
  if (historyState.status === 'loading') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border-2 border-primary p-6 max-w-md w-full doom-noise doom-card doom-corners shadow-2xl">
          <div className="flex justify-center py-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  // Auto-activating (no history, no active program conflict)
  if (historyState.status === 'no_history' && !existingActiveProgram) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border-2 border-primary p-6 max-w-md w-full doom-noise doom-card doom-corners shadow-2xl">
          {error ? (
            <>
              <div className="bg-error-muted border border-error-border p-3 mb-4">
                <p className="text-sm text-error">{error}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 border-2 border-border text-foreground hover:bg-muted disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                CLOSE
              </button>
            </>
          ) : (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Error checking history -- let user proceed anyway
  if (historyState.status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border-2 border-primary p-6 max-w-md w-full doom-noise doom-card doom-corners shadow-2xl">
          <h3 className="text-2xl font-bold text-foreground doom-heading mb-3">
            ACTIVATE {programName.toUpperCase()}
          </h3>

          {existingActiveProgram && (
            <p className="text-sm text-warning-text mb-3">
              Replaces <span className="font-bold">{existingActiveProgram.name}</span> as active program
            </p>
          )}

          {error && (
            <div className="bg-error-muted border border-error-border p-3 mb-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={activating}
              className="flex-1 px-4 py-3 border-2 border-border text-foreground hover:bg-muted disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={activateAndRedirect}
              disabled={activating}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              {activating ? 'ACTIVATING...' : 'ACTIVATE'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main modal: has history OR needs to confirm replacing active program
  const hasHistory = historyState.status === 'has_history'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-primary p-6 max-w-md w-full doom-noise doom-card doom-corners shadow-2xl">
        <h3 className="text-xl font-bold text-foreground doom-heading mb-1">
          ACTIVATE
        </h3>
        <p className="text-lg font-semibold text-foreground mb-3">
          {programName}
        </p>

        {existingActiveProgram && (
          <p className="text-sm text-warning-text mb-3">
            Replaces <span className="font-bold">{existingActiveProgram.name}</span> as active program
          </p>
        )}

        {hasHistory && (
          <p className="text-sm text-muted-foreground mb-4">
            {historyState.completionCount} workout{historyState.completionCount !== 1 ? 's' : ''} logged — continue or start fresh?
          </p>
        )}

        {error && (
          <div className="bg-error-muted border border-error-border p-3 mb-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {hasHistory ? (
            <>
              <button
                type="button"
                onClick={activateAndRedirect}
                disabled={activating}
                className="w-full px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                {activating ? 'ACTIVATING...' : 'CONTINUE'}
              </button>
              <button
                type="button"
                onClick={handleResetAndActivate}
                disabled={activating}
                className="w-full px-4 py-3 border-2 border-border text-foreground hover:bg-muted disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                {activating ? 'RESETTING...' : 'START FRESH'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={activating}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 font-semibold uppercase tracking-wider"
              >
                CANCEL
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={activating}
                className="flex-1 px-4 py-3 border-2 border-border text-foreground hover:bg-muted disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={activateAndRedirect}
                disabled={activating}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                {activating ? 'ACTIVATING...' : 'YES, ACTIVATE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
