import type { TourStep } from '@/components/tour/tour-types'

export const PROGRAMS_PAGE_TOUR_ID = 'programs-page'

export const PROGRAMS_PAGE_STEPS: TourStep[] = [
  {
    id: 'browse-tab',
    targetSelector: '[data-tour="browse-tab"]',
    title: 'BROWSE PROGRAMS',
    body: 'Find a training program that fits your goals. All programs are designed for real gym equipment.',
    placement: 'bottom',
  },
  {
    id: 'level-filter',
    targetSelector: '[data-tour="level-filter"]',
    title: 'FILTER BY LEVEL',
    body: 'Pick your experience level to narrow down programs. Beginner programs start lighter with more guidance.',
    placement: 'bottom',
  },
  {
    id: 'goals-filter',
    targetSelector: '[data-tour="goals-filter"]',
    title: 'FILTER BY GOALS',
    body: 'Select one or more training goals like strength, hypertrophy, or general fitness to find the right fit.',
    placement: 'bottom',
  },
  {
    id: 'program-card',
    targetSelector: '[data-tour="program-card"]',
    title: 'PICK A PROGRAM',
    body: 'Tap any program card to see the full details and add it to your collection.',
    placement: 'bottom',
    optional: true,
  },
]
