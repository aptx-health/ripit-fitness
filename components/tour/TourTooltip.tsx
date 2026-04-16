'use client'

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TourStep } from './tour-types'

interface TourTooltipProps {
  step: TourStep | null
  stepIndex: number
  totalSteps: number
  visible: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  visible,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const [mounted, setMounted] = useState(false)
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null)

  const { refs, floatingStyles } = useFloating({
    placement: step?.placement || 'bottom',
    middleware: [offset(12), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Find and track target element
  useEffect(() => {
    if (!step?.targetSelector || !visible) {
      setTargetEl(null)
      return
    }

    const findTarget = () => {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null
      if (el) {
        setTargetEl(el)
        refs.setReference(el)
      }
    }

    findTarget()

    // Retry briefly in case element isn't rendered yet
    const retryTimer = setTimeout(findTarget, 100)
    return () => clearTimeout(retryTimer)
  }, [step?.targetSelector, visible, refs])

  const isLastStep = stepIndex === totalSteps - 1

  if (!mounted || !visible || !step || !targetEl) return null

  return createPortal(
    <div
      // eslint-disable-next-line react-hooks/refs -- refs.setFloating is a Floating UI callback ref, not a .current access
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 56,
      }}
      className="w-72 max-w-[calc(100vw-2rem)]"
      role="dialog"
      aria-label="Tutorial"
    >
      <div className="bg-card border-2 border-primary doom-noise p-5 shadow-lg">
        {/* Tutorial banner: always-visible label, progress, and Skip */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-primary/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-primary doom-heading uppercase tracking-wider">
              Tutorial
            </span>
            <span className="text-xs text-muted-foreground tabular-nums uppercase tracking-wider">
              Step {stepIndex + 1} of {totalSteps}
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground border border-muted-foreground/40 hover:border-foreground uppercase tracking-wider transition-colors"
            aria-label="Skip tutorial"
          >
            Skip
          </button>
        </div>

        {/* Step title */}
        <h3 className="text-base font-bold text-foreground doom-heading uppercase tracking-wider mb-2">
          {step.title}
        </h3>

        {/* Body */}
        <p className="text-base text-muted-foreground mb-5 leading-relaxed">
          {step.body}
        </p>

        {/* Footer: navigation */}
        <div className="flex items-center justify-end gap-1">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold uppercase tracking-wider"
          >
            {isLastStep ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
