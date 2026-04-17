import type { TourStep } from '@/components/tour/tour-types'

export const WORKOUT_LOGGER_TOUR_ID = 'workout-logger'

// Steps are ordered top-to-bottom by spatial position on screen so the
// tour flows with the user's natural reading/interaction order:
//   1. exercise nav header (top)
//   2. info tab (just below the header)
//   3. reps stepper (first form input)
//   4. weight input (next form row)
//   5. log set button (footer)
//   6. complete button (footer)
export const WORKOUT_LOGGER_STEPS: TourStep[] = [
  {
    id: 'exercise-nav',
    targetSelector: '[data-tour="exercise-nav"]',
    title: 'NAVIGATE EXERCISES',
    body: 'Swipe left/right or use the arrows to move between exercises.',
    placement: 'bottom',
  },
  {
    id: 'info-tab',
    targetSelector: '[data-tour="info-tab"]',
    title: 'NEED HELP WITH FORM?',
    body: 'The Info tab shows how to do the exercise and which muscles it works.',
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
    id: 'log-set',
    targetSelector: '[data-tour="log-set"]',
    title: 'LOG YOUR SET',
    body: 'Tap after each set to save your reps and weight. Your program tells you how many sets to do.',
    placement: 'top',
  },
  {
    id: 'complete',
    targetSelector: '[data-tour="complete"]',
    title: 'FINISH YOUR WORKOUT',
    body: 'When all exercises are done, tap Complete to save everything.',
    placement: 'top',
  },
]
