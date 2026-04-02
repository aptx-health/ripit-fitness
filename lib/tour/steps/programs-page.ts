import type { TourStep } from '@/components/tour/tour-types'

export const PROGRAMS_PAGE_TOUR_ID = 'programs-page'

export const PROGRAMS_PAGE_STEPS: TourStep[] = [
  {
    id: 'program-card',
    targetSelector: '[data-tour="program-card"]',
    title: 'YOUR PROGRAMS',
    body: 'Browse available programs. Each one is tailored to this gym\'s equipment.',
    placement: 'bottom',
  },
  {
    id: 'activate-btn',
    targetSelector: '[data-tour="activate-btn"]',
    title: 'START A PROGRAM',
    body: 'Tap to activate a program. It shows up on your Training page.',
    placement: 'top',
    optional: true,
  },
]
