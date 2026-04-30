const VALID_PLACEMENTS = ['training_tab', 'exercise_logger'] as const
const VALID_USER_TYPES = ['beginner', 'experienced', 'all'] as const
const VALID_LIFECYCLES = ['show_once', 'show_until_dismissed', 'show_always'] as const
const VALID_ICONS = [
  'Lightbulb', 'BookOpen', 'Dumbbell', 'Heart', 'Target',
  'Zap', 'Clock', 'TrendingUp', 'Shield', 'MessageCircle',
] as const

export type Placement = typeof VALID_PLACEMENTS[number]
export type UserType = typeof VALID_USER_TYPES[number]
export type Lifecycle = typeof VALID_LIFECYCLES[number]

export function isValidPlacement(v: string): v is Placement {
  return (VALID_PLACEMENTS as readonly string[]).includes(v)
}

export function isValidUserType(v: string): v is UserType {
  return (VALID_USER_TYPES as readonly string[]).includes(v)
}

export function isValidLifecycle(v: string): v is Lifecycle {
  return (VALID_LIFECYCLES as readonly string[]).includes(v)
}

export function isValidIcon(v: string): boolean {
  return (VALID_ICONS as readonly string[]).includes(v)
}

/**
 * Validate restricted markdown. Only bold, italic, links, and line breaks allowed.
 * Returns an error message if invalid, null if valid.
 */
export function validateMessageContent(content: string): string | null {
  if (!content?.trim()) {
    return 'Content is required'
  }

  // Reject headers
  if (/^#{1,6}\s/m.test(content)) {
    return 'Headers (# syntax) are not allowed in messages'
  }

  // Reject tables
  if (/\|.*---.*\|/.test(content)) {
    return 'Tables are not allowed in messages'
  }

  // Reject code blocks
  if (/```/.test(content)) {
    return 'Code blocks are not allowed in messages'
  }

  // Reject inline code
  if (/`[^`]+`/.test(content)) {
    return 'Inline code is not allowed in messages'
  }

  // Reject HTML tags
  if (/<[a-zA-Z][^>]*>/.test(content)) {
    return 'HTML is not allowed in messages'
  }

  // Reject images
  if (/!\[/.test(content)) {
    return 'Images are not allowed in messages'
  }

  // Reject unordered lists
  if (/^[\s]*[-*+]\s/m.test(content)) {
    return 'Lists are not allowed in messages'
  }

  // Reject ordered lists
  if (/^\s*\d+\.\s/m.test(content)) {
    return 'Ordered lists are not allowed in messages'
  }

  return null
}

/**
 * Validate programTargeting JSON if provided.
 * Must be a JSON array of strings.
 */
export function validateProgramTargeting(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return 'programTargeting must be a JSON array'
    }
    if (!parsed.every((v: unknown) => typeof v === 'string')) {
      return 'programTargeting must contain only string IDs'
    }
    return null
  } catch {
    return 'programTargeting must be valid JSON'
  }
}
