import type { TourStep } from '@/components/tour/tour-types'

export const TRAINING_PAGE_TOUR_ID = 'training-page'

export const TRAINING_PAGE_STEPS: TourStep[] = [
  {
    id: 'week-nav',
    targetSelector: '[data-tour="week-nav"]',
    title: 'YOUR TRAINING WEEK',
    body: 'Navigate between weeks of your program using the arrows.',
    placement: 'bottom',
  },
  {
    id: 'workout-card',
    targetSelector: '[data-tour="workout-card"]',
    title: 'YOUR WORKOUTS',
    body: 'Each card is a training day. Tap one to start logging.',
    placement: 'bottom',
  },
  {
    id: 'workout-card-swipe',
    targetSelector: '[data-tour="workout-card"]',
    title: 'MORE OPTIONS',
    body: 'Swipe a workout card left to preview or skip it.',
    placement: 'bottom',
  },
]
