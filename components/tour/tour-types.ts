export interface TourStep {
  id: string
  /** CSS selector for the target element, e.g. '[data-tour="reps-stepper"]' */
  targetSelector: string
  title: string
  body: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  /** Skip this step if the target element isn't found in the DOM */
  optional?: boolean
}

export interface TourContextValue {
  isActive: boolean
  isPaused: boolean
  tourId: string | null
  currentStep: TourStep | null
  stepIndex: number
  totalSteps: number
  startTour: (tourId: string, steps: TourStep[]) => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  setTourPaused: (paused: boolean) => void
}
