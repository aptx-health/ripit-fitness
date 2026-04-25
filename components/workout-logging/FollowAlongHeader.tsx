'use client'

import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface FollowAlongHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  onClose: () => void
  onSwitchToLogging: () => void
}

export default function FollowAlongHeader({
  currentExerciseIndex,
  totalExercises,
  onClose,
  onSwitchToLogging,
}: FollowAlongHeaderProps) {
  const [bannerVisible, setBannerVisible] = useState(true)
  const [bannerFading, setBannerFading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Auto-fade the banner after 5 seconds
  useEffect(() => {
    if (!bannerVisible || showConfirm) return
    const timer = setTimeout(() => {
      setBannerFading(true)
      setTimeout(() => setBannerVisible(false), 500)
    }, 15000)
    return () => clearTimeout(timer)
  }, [bannerVisible, showConfirm])

  const handleBannerTap = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const handleConfirmSwitch = useCallback(() => {
    setShowConfirm(false)
    setBannerVisible(false)
    onSwitchToLogging()
  }, [onSwitchToLogging])

  return (
    <>
      <div
        className="bg-primary text-primary-foreground px-4 py-2 border-b border-primary-muted-dark flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        <div className="flex items-center gap-3">
          {/* Segmented progress bar */}
          <div className="flex-1 flex gap-1" role="progressbar" aria-valuenow={currentExerciseIndex + 1} aria-valuemin={1} aria-valuemax={totalExercises} aria-label={`Exercise ${currentExerciseIndex + 1} of ${totalExercises}`}>
            {Array.from({ length: totalExercises }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 transition-colors ${
                  i <= currentExerciseIndex
                    ? 'bg-primary-foreground'
                    : 'bg-primary-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 min-w-12 flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/15 transition-colors doom-focus-ring"
            aria-label="Close workout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Auto-fade banner */}
        {bannerVisible && (
          <button
            type="button"
            onClick={handleBannerTap}
            className={`w-full text-center text-sm text-primary-foreground/70 py-1 transition-opacity duration-500 ${
              bannerFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Ready to track weights? Tap here to switch to logging.
          </button>
        )}
      </div>

      {/* Switch to logging confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border-2 border-border p-6 sm:p-8 text-center max-w-sm w-full shadow-xl doom-corners">
            <h3 className="text-lg font-bold text-foreground mb-3 uppercase tracking-wider">
              Switch to Logging Mode?
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This will let you track your weights and reps for each set. You can always switch back to Follow Along mode in Settings.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 text-base bg-muted text-foreground hover:bg-secondary transition-colors font-bold uppercase tracking-wider border-2 border-border hover:border-primary doom-focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="flex-1 px-4 py-3 text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold uppercase tracking-wider doom-button-3d doom-focus-ring"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
