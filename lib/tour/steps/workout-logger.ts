import type { TourStep } from '@/components/tour/tour-types'

export const WORKOUT_LOGGER_TOUR_ID = 'workout-logger'

export const WORKOUT_LOGGER_STEPS: TourStep[] = [
  {
    id: 'exercise-nav',
    targetSelector: '[data-tour="exercise-nav"]',
    title: 'NAVIGATE EXERCISES',
    body: 'Swipe left/right or use the arrows to move between exercises.',
    placement: 'bottom',
  },
  {
    id: 'reps-stepper',
    targetSelector: '[data-tour="reps-stepper"]',
    title: 'SET YOUR REPS',
    body: 'How many repetitions you did in this set. Tap + or - to adjust. The number is pre-filled from your program.',
    placement: 'bottom',
  },
  {
    id: 'weight-input',
    targetSelector: '[data-tour="weight-input"]',
    title: 'ENTER WEIGHT',
    body: 'Tap to open the keypad. Start lighter than you think.',
    placement: 'top',
  },
  {
    id: 'intensity-input',
    targetSelector: '[data-tour="intensity-input"]',
    title: 'RATE YOUR EFFORT (RIR)',
    body: 'After your set, ask yourself: how many more reps could I have done? That number is your RIR. Leave blank if unsure.',
    placement: 'top',
    optional: true,
  },
  {
    id: 'log-set',
    targetSelector: '[data-tour="log-set"]',
    title: 'LOG YOUR SET',
    body: 'Tap after each set to save your reps, weight, and effort. Your program tells you how many sets to do.',
    placement: 'top',
  },
  {
    id: 'info-tab',
    targetSelector: '[data-tour="info-tab"]',
    title: 'NEED HELP WITH FORM?',
    body: 'The Info tab shows how to do the exercise and which muscles it works.',
    placement: 'bottom',
  },
  {
    id: 'complete',
    targetSelector: '[data-tour="complete"]',
    title: 'FINISH YOUR WORKOUT',
    body: 'When all exercises are done, tap Complete to save everything.',
    placement: 'top',
  },
]
