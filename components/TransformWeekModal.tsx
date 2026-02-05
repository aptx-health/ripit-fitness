'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'

interface TransformWeekModalProps {
  isOpen: boolean
  onClose: () => void
  weekId: string
  weekNumber: number
  onTransform: (updatedWeek: any) => Promise<void>
}

interface TransformStats {
  intensityUpdatedCount: number
  volumeAddedCount: number
  volumeRemovedCount: number
  skippedExercises: number
}

export default function TransformWeekModal({
  isOpen,
  onClose,
  weekId,
  weekNumber,
  onTransform
}: TransformWeekModalProps) {
  const [intensityDirection, setIntensityDirection] = useState<'MORE' | 'LESS' | 'NONE'>('NONE')
  const [intensityMagnitude, setIntensityMagnitude] = useState<number>(1)
  const [volumeAdjustment, setVolumeAdjustment] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stats, setStats] = useState<TransformStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Validation: at least one adjustment must be selected
    const hasIntensityAdjustment = intensityDirection !== 'NONE'
    const hasVolumeAdjustment = volumeAdjustment !== 0

    if (!hasIntensityAdjustment && !hasVolumeAdjustment) {
      setError('Please select at least one transformation')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Calculate intensity adjustment value
      const intensityValue = hasIntensityAdjustment
        ? (intensityDirection === 'MORE' ? intensityMagnitude : -intensityMagnitude)
        : undefined

      const response = await fetch(`/api/weeks/${weekId}/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intensityAdjustment: intensityValue,
          volumeAdjustment: hasVolumeAdjustment ? volumeAdjustment : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to transform week')
      }

      const data = await response.json()
      setStats(data.stats)

      // Call parent's onTransform to update state with the updated week
      await onTransform(data.week)

      // Auto-close after 2 seconds showing stats
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form state
    setIntensityDirection('NONE')
    setIntensityMagnitude(1)
    setVolumeAdjustment(0)
    setIsSubmitting(false)
    setStats(null)
    setError(null)
    onClose()
  }

  const incrementMagnitude = () => {
    setIntensityMagnitude(prev => Math.min(prev + 1, 5))
  }

  const decrementMagnitude = () => {
    setIntensityMagnitude(prev => Math.max(prev - 1, 1))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card w-full max-w-md flex flex-col doom-noise doom-corners border-2 border-border">
        {/* Header */}
        <div className="p-6 border-b-2 border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-foreground doom-heading uppercase tracking-wider">
              TRANSFORM WEEK {weekNumber}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50 doom-focus-ring"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Modifies all exercises in the week
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Stats Display */}
          {stats && (
            <div className="bg-success/10 border-2 border-success p-4 space-y-1 doom-corners">
              <p className="text-sm font-bold text-success doom-heading uppercase tracking-wider">Transformation Complete!</p>
              {stats.intensityUpdatedCount > 0 && (
                <p className="text-xs text-foreground">
                  Updated intensity on {stats.intensityUpdatedCount} set{stats.intensityUpdatedCount !== 1 ? 's' : ''}
                </p>
              )}
              {stats.volumeAddedCount > 0 && (
                <p className="text-xs text-foreground">
                  Added {stats.volumeAddedCount} set{stats.volumeAddedCount !== 1 ? 's' : ''} to {stats.volumeAddedCount} exercise{stats.volumeAddedCount !== 1 ? 's' : ''}
                </p>
              )}
              {stats.volumeRemovedCount > 0 && (
                <p className="text-xs text-foreground">
                  Removed {stats.volumeRemovedCount} set{stats.volumeRemovedCount !== 1 ? 's' : ''} from {stats.volumeRemovedCount} exercise{stats.volumeRemovedCount !== 1 ? 's' : ''}
                </p>
              )}
              {stats.skippedExercises > 0 && (
                <p className="text-xs text-muted-foreground">
                  Skipped {stats.skippedExercises} exercise{stats.skippedExercises !== 1 ? 's' : ''} (no sets to modify)
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-error/10 border-2 border-error p-4 doom-corners">
              <p className="text-sm font-semibold text-error">{error}</p>
            </div>
          )}

          {/* Intensity Adjustment Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground doom-heading uppercase tracking-wider">Adjust Intensity</h3>

            {/* Intensity Direction Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setIntensityDirection('NONE')}
                disabled={isSubmitting || stats !== null}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-2 transition-colors doom-focus-ring ${
                  intensityDirection === 'NONE'
                    ? 'bg-primary text-primary-foreground border-primary doom-button-3d'
                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                } disabled:opacity-50`}
              >
                None
              </button>
              <button
                onClick={() => setIntensityDirection('MORE')}
                disabled={isSubmitting || stats !== null}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-2 transition-colors doom-focus-ring ${
                  intensityDirection === 'MORE'
                    ? 'bg-primary text-primary-foreground border-primary doom-button-3d'
                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                } disabled:opacity-50`}
              >
                More
              </button>
              <button
                onClick={() => setIntensityDirection('LESS')}
                disabled={isSubmitting || stats !== null}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-2 transition-colors doom-focus-ring ${
                  intensityDirection === 'LESS'
                    ? 'bg-primary text-primary-foreground border-primary doom-button-3d'
                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                } disabled:opacity-50`}
              >
                Less
              </button>
            </div>

            {/* Intensity Magnitude Stepper */}
            {intensityDirection !== 'NONE' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={decrementMagnitude}
                  disabled={isSubmitting || stats !== null || intensityMagnitude <= 1}
                  className="p-2 bg-muted border-2 border-border hover:bg-muted/80 disabled:opacity-50 doom-button-3d doom-focus-ring"
                >
                  <Minus size={16} />
                </button>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-foreground doom-heading">
                    {intensityDirection === 'MORE' ? '+' : '-'}{intensityMagnitude}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Intensity adjustment
                  </div>
                </div>
                <button
                  onClick={incrementMagnitude}
                  disabled={isSubmitting || stats !== null || intensityMagnitude >= 5}
                  className="p-2 bg-muted border-2 border-border hover:bg-muted/80 disabled:opacity-50 doom-button-3d doom-focus-ring"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-border" />

          {/* Volume Adjustment Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground doom-heading uppercase tracking-wider">Adjust Volume</h3>

            <div className="flex gap-3">
              <button
                onClick={() => setVolumeAdjustment(volumeAdjustment === -1 ? 0 : -1)}
                disabled={isSubmitting || stats !== null}
                className={`flex-1 px-4 py-3 border-2 transition-colors doom-focus-ring ${
                  volumeAdjustment === -1
                    ? 'bg-primary text-primary-foreground border-primary doom-button-3d'
                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Minus size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Remove 1 Set</span>
                </div>
              </button>

              <button
                onClick={() => setVolumeAdjustment(volumeAdjustment === 1 ? 0 : 1)}
                disabled={isSubmitting || stats !== null}
                className={`flex-1 px-4 py-3 border-2 transition-colors doom-focus-ring ${
                  volumeAdjustment === 1
                    ? 'bg-primary text-primary-foreground border-primary doom-button-3d'
                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Add 1 Set</span>
                </div>
              </button>
            </div>

            {volumeAdjustment !== 0 && (
              <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                {volumeAdjustment === 1 ? 'Will add' : 'Will remove'} 1 set per exercise
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!stats && (
          <div className="flex gap-3 p-6 border-t-2 border-border">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border-2 border-border hover:bg-muted transition-colors text-foreground disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              {isSubmitting ? 'Transforming...' : 'Apply'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
