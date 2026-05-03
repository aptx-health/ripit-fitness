import { describe, expect, it } from 'vitest'
import {
  isValidIcon,
  isValidLifecycle,
  isValidPlacement,
  isValidUserType,
  validateMessageContent,
  validateProgramTargeting,
} from '@/lib/admin/message-validation'

describe('Message Validation', () => {
  describe('isValidPlacement', () => {
    it('accepts valid placements', () => {
      expect(isValidPlacement('training_tab')).toBe(true)
      expect(isValidPlacement('exercise_logger')).toBe(true)
    })

    it('rejects invalid placements', () => {
      expect(isValidPlacement('dashboard')).toBe(false)
      expect(isValidPlacement('')).toBe(false)
      expect(isValidPlacement('TRAINING_TAB')).toBe(false)
    })
  })

  describe('isValidUserType', () => {
    it('accepts valid user types', () => {
      expect(isValidUserType('beginner')).toBe(true)
      expect(isValidUserType('experienced')).toBe(true)
      expect(isValidUserType('all')).toBe(true)
    })

    it('rejects invalid user types', () => {
      expect(isValidUserType('advanced')).toBe(false)
      expect(isValidUserType('')).toBe(false)
    })
  })

  describe('isValidLifecycle', () => {
    it('accepts valid lifecycles', () => {
      expect(isValidLifecycle('show_once')).toBe(true)
      expect(isValidLifecycle('show_until_dismissed')).toBe(true)
      expect(isValidLifecycle('show_always')).toBe(true)
    })

    it('rejects invalid lifecycles', () => {
      expect(isValidLifecycle('show_twice')).toBe(false)
      expect(isValidLifecycle('')).toBe(false)
    })
  })

  describe('isValidIcon', () => {
    it('accepts all curated icons', () => {
      const validIcons = [
        'Lightbulb', 'BookOpen', 'Dumbbell', 'Heart', 'Target',
        'Zap', 'Clock', 'TrendingUp', 'Shield', 'MessageCircle',
      ]
      for (const icon of validIcons) {
        expect(isValidIcon(icon)).toBe(true)
      }
    })

    it('rejects unknown icons', () => {
      expect(isValidIcon('Rocket')).toBe(false)
      expect(isValidIcon('lightbulb')).toBe(false) // case-sensitive
    })
  })

  describe('validateMessageContent', () => {
    it('accepts valid content with bold, italic, links', () => {
      expect(validateMessageContent('Hello **world**')).toBeNull()
      expect(validateMessageContent('Check *this* out')).toBeNull()
      expect(validateMessageContent('[Click here](/learn/article)')).toBeNull()
      expect(validateMessageContent('Line one\nLine two')).toBeNull()
      expect(validateMessageContent('{icon:BookOpen} Read more')).toBeNull()
    })

    it('rejects empty content', () => {
      expect(validateMessageContent('')).toBe('Content is required')
      expect(validateMessageContent('   ')).toBe('Content is required')
    })

    it('rejects headers', () => {
      expect(validateMessageContent('# Heading')).toContain('Headers')
      expect(validateMessageContent('## Subheading')).toContain('Headers')
      expect(validateMessageContent('Text before\n# Heading after')).toContain('Headers')
    })

    it('rejects tables', () => {
      expect(validateMessageContent('| col |---| col |')).toContain('Tables')
    })

    it('rejects code blocks', () => {
      expect(validateMessageContent('```code```')).toContain('Code blocks')
    })

    it('rejects inline code', () => {
      expect(validateMessageContent('Use `prisma` here')).toContain('Inline code')
    })

    it('rejects HTML', () => {
      expect(validateMessageContent('<div>hello</div>')).toContain('HTML')
      expect(validateMessageContent('<b>bold</b>')).toContain('HTML')
    })

    it('rejects images', () => {
      expect(validateMessageContent('![alt](image.png)')).toContain('Images')
    })

    it('rejects unordered lists', () => {
      expect(validateMessageContent('- item one')).toContain('Lists')
      expect(validateMessageContent('* item one')).toContain('Lists')
    })

    it('rejects ordered lists', () => {
      expect(validateMessageContent('1. first item')).toContain('Ordered lists')
    })

    it('allows bold asterisks that are not list markers', () => {
      // **bold** starts with * but is not a list item
      expect(validateMessageContent('**bold text**')).toBeNull()
    })
  })

  describe('validateProgramTargeting', () => {
    it('accepts null/empty values', () => {
      expect(validateProgramTargeting(null)).toBeNull()
      expect(validateProgramTargeting(undefined)).toBeNull()
      expect(validateProgramTargeting('')).toBeNull()
    })

    it('accepts valid JSON arrays of strings', () => {
      expect(validateProgramTargeting('["id1","id2"]')).toBeNull()
      expect(validateProgramTargeting('["single"]')).toBeNull()
      expect(validateProgramTargeting('[]')).toBeNull()
    })

    it('rejects non-array JSON', () => {
      expect(validateProgramTargeting('"just a string"')).toContain('must be a JSON array')
      expect(validateProgramTargeting('{"key":"val"}')).toContain('must be a JSON array')
    })

    it('rejects arrays with non-string values', () => {
      expect(validateProgramTargeting('[1,2,3]')).toContain('must contain only string IDs')
      expect(validateProgramTargeting('[null]')).toContain('must contain only string IDs')
    })

    it('rejects invalid JSON', () => {
      expect(validateProgramTargeting('not json')).toContain('must be valid JSON')
    })
  })
})
