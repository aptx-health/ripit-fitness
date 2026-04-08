'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { TourOverlay } from './TourOverlay'
import { TourTooltip } from './TourTooltip'
import type { TourContextValue, TourStep } from './tour-types'

const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return ctx
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useUserSettings()
  const [tourId, setTourId] = useState<string | null>(null)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  // Track tours completed this session to prevent re-triggering before settings refetch
  const justCompletedRef = useRef<Set<string>>(new Set())

  const isActive = tourId !== null

  const completeTour = useCallback(async (id: string) => {
    setTourId(null)
    setSteps([])
    setStepIndex(0)
    justCompletedRef.current.add(id)

    if (settings) {
      try {
        const completed: string[] = JSON.parse(settings.completedTours || '[]')
        if (!completed.includes(id)) {
          completed.push(id)
          await updateSettings({ completedTours: JSON.stringify(completed) })
        }
      } catch {
        await updateSettings({ completedTours: JSON.stringify([id]) })
      }
    }
  }, [settings, updateSettings])

  const startTour = useCallback((id: string, tourSteps: TourStep[]) => {
    // Don't restart a tour that was just completed this session
    if (justCompletedRef.current.has(id)) return

    // Filter out optional steps whose targets don't exist
    const availableSteps = tourSteps.filter(step => {
      if (!step.optional) return true
      return document.querySelector(step.targetSelector) !== null
    })

    if (availableSteps.length === 0) return

    setTourId(id)
    setSteps(availableSteps)
    setStepIndex(0)
    setIsPaused(false)
  }, [])

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      // Skip steps whose targets aren't in the DOM
      let next = stepIndex + 1
      while (next < steps.length && !document.querySelector(steps[next].targetSelector)) {
        next++
      }
      if (next < steps.length) {
        setStepIndex(next)
      } else if (tourId) {
        completeTour(tourId)
      }
    } else if (tourId) {
      completeTour(tourId)
    }
  }, [stepIndex, steps, tourId, completeTour])

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    }
  }, [stepIndex])

  const skipTour = useCallback(() => {
    if (tourId) {
      completeTour(tourId)
    }
  }, [tourId, completeTour])

  const setTourPaused = useCallback((paused: boolean) => {
    setIsPaused(paused)
  }, [])

  const currentStep = isActive && steps[stepIndex] ? steps[stepIndex] : null
  const visible = isActive && !isPaused && currentStep !== null

  const value = useMemo<TourContextValue>(() => ({
    isActive,
    isPaused,
    tourId,
    currentStep,
    stepIndex,
    totalSteps: steps.length,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    setTourPaused,
  }), [isActive, isPaused, tourId, currentStep, stepIndex, steps.length, startTour, nextStep, prevStep, skipTour, setTourPaused])

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourOverlay
        targetSelector={currentStep?.targetSelector || null}
        visible={visible}
        onClickOverlay={nextStep}
      />
      <TourTooltip
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        visible={visible}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </TourContext.Provider>
  )
}
