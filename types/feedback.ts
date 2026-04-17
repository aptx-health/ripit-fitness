export type FeedbackCategory = 'bug' | 'feature' | 'confusion' | 'general' | 'post_session'
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved'

export type FeedbackSubmission = {
  category: FeedbackCategory
  message: string
  pageUrl: string
  userAgent?: string
  properties?: Record<string, string>
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

export const POST_SESSION_QUESTIONS = [
  'How did that feel?',
  'Anything confusing about logging today?',
  'What almost made you skip today?',
  'Was there an exercise you weren\'t sure how to do?',
] as const

/** Number of completed workouts between post-session prompts */
export const POST_SESSION_COOLDOWN = 3
