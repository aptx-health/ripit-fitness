'use client'

import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface FollowAlongHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  onClose: () => void
  onSwitchToLogging: () => void
}

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const useDoubleRow = total > 5
  const topCount = useDoubleRow ? Math.ceil(total / 2) : total
  const bottomCount = useDoubleRow ? total - topCount : 0

  const renderRow = (count: number, startIndex: number) => (
    <div className="flex gap-[3px]" style={{ width: '110px' }}>
      {Array.from({ length: count }, (_, i) => {
        const exerciseIndex = startIndex + i
        return (
          <div
            key={exerciseIndex}
            className="h-[5px] flex-1 transition-colors"
            style={{
              backgroundColor: exerciseIndex <= current
                ? 'var(--primary)'
                : 'rgba(0,0,0,0.25)',
              boxShadow: exerciseIndex <= current
                ? undefined
                : 'inset 0 1px 0 rgba(0,0,0,0.20)',
            }}
          />
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-[3px]" style={{ width: '110px' }}>
      {renderRow(topCount, 0)}
      {useDoubleRow && renderRow(bottomCount, topCount)}
    </div>
  )
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
        className="bg-secondary text-secondary-foreground flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)' }}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <ProgressIndicator current={currentExerciseIndex} total={totalExercises} />

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-secondary-foreground/80 hover:text-secondary-foreground transition-colors doom-focus-ring"
            aria-label="Close workout"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {bannerVisible && (
          <button
            type="button"
            onClick={handleBannerTap}
            className={`w-full text-center text-sm text-secondary-foreground/50 pb-2 transition-opacity duration-500 ${
              bannerFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Ready to track weights? Tap here to switch to logging.
          </button>
        )}
      </div>

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
