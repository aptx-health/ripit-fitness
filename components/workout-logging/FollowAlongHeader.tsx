'use client'

import { ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import LoggerConfirm from './LoggerConfirm'

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
            className="-my-2 -mr-2 inline-flex h-12 w-12 items-center justify-center text-secondary-foreground/80 hover:text-secondary-foreground transition-colors doom-focus-ring"
            aria-label="Close workout"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {bannerVisible && (
          <button
            type="button"
            onClick={handleBannerTap}
            className={`w-full min-h-12 pb-2 px-4 text-sm text-secondary-foreground/90 hover:text-secondary-foreground hover:bg-black/5 active:bg-black/10 cursor-pointer transition-all duration-500 doom-focus-ring flex items-center justify-center gap-1.5 ${
              bannerFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span>
              Ready to track weights?{' '}
              <span className="font-semibold underline underline-offset-2">Switch to logging</span>
            </span>
            <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      <LoggerConfirm
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Switch to logging mode?"
        body="This lets you track weights and reps for each set. You can switch back to Follow Along in Settings."
        confirmLabel="Switch"
        onConfirm={handleConfirmSwitch}
      />
    </>
  )
}
