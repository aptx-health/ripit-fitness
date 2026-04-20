export type FeedbackCategory = 'bug' | 'feature' | 'confusion' | 'general' | 'post_session'
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved'

export type FeedbackSubmission = {
  category: FeedbackCategory
  message?: string
  pageUrl: string
  userAgent?: string
  properties?: Record<string, string>
  rating?: number
  refinements?: string[]
}

export const FEEDBACK_CATEGORIES: Array<{
  value: FeedbackCategory
  label: string
  description: string
  placeholder: string
}> = [
  { value: 'bug', label: 'Bug', description: 'Something broken', placeholder: 'What went wrong? What did you expect to happen?' },
  { value: 'feature', label: 'Feature', description: 'Something missing', placeholder: 'What would you like to see added?' },
  { value: 'confusion', label: 'Confused', description: 'Something unclear', placeholder: 'What was confusing? Where did you get stuck?' },
  { value: 'general', label: 'General', description: 'Other feedback', placeholder: 'What\'s on your mind?' },
  { value: 'post_session', label: 'Post-Session', description: 'Post-workout feedback', placeholder: '' },
]

export const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'confusion', 'general', 'post_session']
export const VALID_STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'resolved']

/** Refinement categories for post-session feedback (rating < 5) */
export const POST_SESSION_REFINEMENTS = [
  { value: 'confusing', label: 'Confusing to use' },
  { value: 'cant_find', label: 'Couldn\'t find something' },
  { value: 'buggy', label: 'Something felt buggy' },
  { value: 'exercise_info', label: 'Exercise info was wrong/missing' },
  { value: 'too_many_steps', label: 'Too many steps' },
  { value: 'other', label: 'Something else' },
] as const

export type PostSessionRefinement = typeof POST_SESSION_REFINEMENTS[number]['value']

export const VALID_REFINEMENTS: string[] = POST_SESSION_REFINEMENTS.map(r => r.value)

/** Number of completed workouts between post-session prompts */
export const POST_SESSION_COOLDOWN = 3
