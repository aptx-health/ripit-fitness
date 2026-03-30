export type FeedbackCategory = 'bug' | 'feature' | 'confusion' | 'general'
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved'

export type FeedbackSubmission = {
  category: FeedbackCategory
  message: string
  pageUrl: string
  userAgent?: string
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
]

export const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'confusion', 'general']
export const VALID_STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'resolved']
