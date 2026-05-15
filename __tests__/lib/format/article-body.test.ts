import { describe, expect, it } from 'vitest'
import { stripDuplicateTitleHeading } from '@/lib/format/article-body'

describe('stripDuplicateTitleHeading', () => {
  it('strips a leading H1 that matches the article title', () => {
    const body = '# Your First Week: What to Expect\n\nWelcome to the gym.'
    const result = stripDuplicateTitleHeading(body, 'Your First Week: What to Expect')
    expect(result).toBe('Welcome to the gym.')
  })

  it('matches case-insensitively', () => {
    const body = '# YOUR FIRST WEEK\n\nBody text.'
    const result = stripDuplicateTitleHeading(body, 'Your First Week')
    expect(result).toBe('Body text.')
  })

  it('tolerates extra whitespace around the heading', () => {
    const body = '\n\n#   Hello World   \n\nNext.'
    const result = stripDuplicateTitleHeading(body, 'Hello World')
    expect(result).toBe('Next.')
  })

  it('tolerates closing # tokens (`# Title #`)', () => {
    const body = '# Hello #\n\nBody.'
    const result = stripDuplicateTitleHeading(body, 'Hello')
    expect(result).toBe('Body.')
  })

  it('preserves a leading H1 that does not match the title', () => {
    const body = '# Some Other Heading\n\nBody text.'
    const result = stripDuplicateTitleHeading(body, 'Article Title')
    expect(result).toBe(body)
  })

  it('preserves the body when there is no leading H1', () => {
    const body = 'Just a paragraph.\n\n## Subheading\n\nMore.'
    const result = stripDuplicateTitleHeading(body, 'Just a paragraph.')
    expect(result).toBe(body)
  })

  it('does not strip an H2 that happens to match', () => {
    const body = '## Title\n\nBody.'
    const result = stripDuplicateTitleHeading(body, 'Title')
    expect(result).toBe(body)
  })

  it('handles empty body without throwing', () => {
    expect(stripDuplicateTitleHeading('', 'Anything')).toBe('')
  })

  it('tolerates inline emphasis tokens in the heading', () => {
    const body = '# *Your First Week*\n\nBody.'
    const result = stripDuplicateTitleHeading(body, 'Your First Week')
    expect(result).toBe('Body.')
  })
})
