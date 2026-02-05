'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { clientLogger } from '@/lib/logger'

interface CompletionStats {
  programName: string
  startDate: string
  endDate: string
  totalDays: number
  totalWorkouts: number
  completedWorkouts: number
  skippedWorkouts: number
  // Strength program stats
  totalExercises?: number
  totalVolume?: number
  totalSets?: number
  // Cardio program stats
  totalDuration?: number
  totalDistance?: number
  totalSessions?: number
}

interface ProgramCompletionModalProps {
  open: boolean
  programId: string
  programType?: 'strength' | 'cardio'
  onClose: () => void
  onRestart?: () => void
}

export function ProgramCompletionModal({
  open,
  programId,
  programType = 'strength',
  onClose,
  onRestart,
}: ProgramCompletionModalProps) {
  const router = useRouter()
  const [stats, setStats] = useState<CompletionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setRestarting(false)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !programId) return

    clientLogger.debug('[CompletionModal] Opening modal for program:', programId)
    const abortController = new AbortController()

    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        clientLogger.debug('[CompletionModal] Fetching stats...')

        const statsUrl = programType === 'cardio'
          ? `/api/cardio/programs/${programId}/completion-stats`
          : `/api/programs/${programId}/completion-stats`

        const response = await fetch(statsUrl, {
          signal: abortController.signal
        })

        if (!response.ok) {
          throw new Error('Failed to fetch completion stats')
        }

        const { data } = await response.json()

        // Only update state if not aborted
        if (!abortController.signal.aborted) {
          clientLogger.debug('[CompletionModal] Stats loaded:', data)
          setStats(data)
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          clientLogger.debug('[CompletionModal] Stats fetch aborted')
          return
        }
        clientLogger.error('[CompletionModal] Error fetching stats:', err)
        if (!abortController.signal.aborted) {
          setError('Failed to load completion stats')
        }
      } finally {
        if (!abortController.signal.aborted) {
          clientLogger.debug('[CompletionModal] Loading complete')
          setLoading(false)
        }
      }
    }

    fetchStats()

    // Cleanup: abort fetch if modal closes
    return () => {
      abortController.abort()
    }
  }, [open, programId])

  const handleRestart = async () => {
    // Prevent double-clicks
    if (restarting) return

    try {
      setRestarting(true)
      setError(null)

      const restartUrl = programType === 'cardio'
        ? `/api/cardio/programs/${programId}/restart`
        : `/api/programs/${programId}/restart`

      const response = await fetch(restartUrl, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to restart program')
      }

      const result = await response.json()
      clientLogger.debug('Restart response:', result)
      clientLogger.info(`Successfully archived ${result.archivedCompletions} workout completions`)

      // Let parent handle navigation/refresh, or fallback to default behavior
      if (onRestart) {
        onRestart()
      } else {
        // Fallback: navigate to week 1 and refresh
        router.push('/training?week=1')
        setTimeout(() => router.refresh(), 100)
      }

      // Close modal after navigation is initiated
      // Small delay to prevent state conflicts
      setTimeout(() => {
        onClose()
      }, 50)
    } catch (err) {
      clientLogger.error('Error restarting program:', err)
      setError('Failed to restart program')
      setRestarting(false)
    }
  }

  const handleChooseNewProgram = () => {
    // Prevent clicks during restart
    if (restarting) return

    onClose()
    // Navigate to appropriate programs page
    const programsPath = programType === 'cardio' ? '/cardio/programs' : '/programs'
    router.push(programsPath)
  }

  const formatVolume = (volume: number | undefined | null) => {
    if (!volume || volume === 0) {
      return '0'
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`
    }
    return volume.toLocaleString()
  }

  if (!open) return null

  clientLogger.debug('[CompletionModal] Render state:', { loading, restarting, hasStats: !!stats, hasError: !!error })

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="backdrop-blur-md bg-background/80 flex items-center justify-center p-0 sm:p-4"
    >
      <div
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        className="bg-card border-4 border-border w-full h-full sm:h-auto sm:w-[90vw] sm:max-w-2xl sm:max-h-[85vh] flex flex-col mx-auto doom-card pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        {/* Header */}
        <div className="flex flex-col px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-border bg-primary text-primary-foreground relative">
          <h2 className="text-xl font-bold tracking-wide uppercase">
            Program Complete!
          </h2>
          <p className="text-sm text-primary-foreground/90 mt-1">
            Congratulations on finishing your program
          </p>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-primary-foreground/80 hover:text-primary-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="bg-error/10 border-2 border-error text-error px-4 py-3">
              {error}
            </div>
          )}

          {stats && !loading && (
            <div className="space-y-6">
              <div className="border-2 border-border bg-muted/30 p-4">
                <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wide">
                  {stats.programName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(stats.startDate).toLocaleDateString()} -{' '}
                  {new Date(stats.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.totalDays} days
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-border bg-muted/30 p-4">
                  <div className="text-3xl font-bold text-foreground">
                    {stats.totalWorkouts}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Total {programType === 'cardio' ? 'Sessions' : 'Workouts'}
                  </div>
                </div>

                <div className="border-2 border-success bg-success/10 p-4">
                  <div className="text-3xl font-bold text-success">
                    {stats.completedWorkouts}
                  </div>
                  <div className="text-xs text-success uppercase tracking-wide mt-1">
                    Completed
                  </div>
                </div>

                {programType === 'strength' && (
                  <>
                    <div className="border-2 border-border bg-muted/30 p-4">
                      <div className="text-3xl font-bold text-foreground">
                        {stats.totalExercises}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                        Exercises
                      </div>
                    </div>

                    <div className="border-2 border-border bg-muted/30 p-4">
                      <div className="text-3xl font-bold text-foreground">
                        {formatVolume(stats.totalVolume)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                        Volume (lbs)
                      </div>
                    </div>

                    <div className="border-2 border-border bg-muted/30 p-4 col-span-2">
                      <div className="text-3xl font-bold text-foreground">
                        {stats.totalSets}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                        Total Sets
                      </div>
                    </div>
                  </>
                )}

                {programType === 'cardio' && (
                  <>
                    <div className="border-2 border-border bg-muted/30 p-4">
                      <div className="text-3xl font-bold text-foreground">
                        {stats.totalDuration ? Math.round(stats.totalDuration / 60) : 0}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                        Hours
                      </div>
                    </div>

                    {stats.totalDistance && stats.totalDistance > 0 && (
                      <div className="border-2 border-border bg-muted/30 p-4">
                        <div className="text-3xl font-bold text-foreground">
                          {stats.totalDistance.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                          Miles
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {stats.skippedWorkouts > 0 && (
                <p className="text-sm text-muted-foreground text-center border-t-2 border-border pt-4">
                  {stats.skippedWorkouts} workout{stats.skippedWorkouts !== 1 ? 's' : ''} skipped
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t-2 border-border bg-muted">
          <div className="flex flex-col gap-3">
            {programType === 'strength' && onRestart && (
              <button
                onClick={handleRestart}
                disabled={loading || restarting}
                className="w-full px-6 py-3 bg-success text-success-foreground hover:bg-success-hover font-bold uppercase tracking-wider doom-button-3d disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restarting ? 'Restarting...' : 'Restart Program'}
              </button>
            )}
            <button
              onClick={handleChooseNewProgram}
              disabled={restarting}
              className="w-full px-6 py-3 text-secondary-foreground bg-secondary border-2 border-secondary hover:bg-secondary-hover font-bold uppercase tracking-wider transition-all shadow-[0_3px_0_var(--secondary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--secondary-active),0_0_20px_rgba(0,0,0,0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--secondary-active),0_2px_4px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose New Program
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
