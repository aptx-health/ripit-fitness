import { describe, it, expect } from 'vitest'
import { generateCopyName } from '@/lib/copy-name'

describe('generateCopyName', () => {
  it('should append (Copy) when no conflicts', () => {
    expect(generateCopyName('Day 1', ['Day 1'])).toBe('Day 1 (Copy)')
  })

  it('should append (Copy 2) when (Copy) already exists', () => {
    expect(generateCopyName('Day 1', ['Day 1', 'Day 1 (Copy)'])).toBe('Day 1 (Copy 2)')
  })

  it('should find next available copy number', () => {
    const existing = ['Day 1', 'Day 1 (Copy)', 'Day 1 (Copy 2)', 'Day 1 (Copy 3)']
    expect(generateCopyName('Day 1', existing)).toBe('Day 1 (Copy 4)')
  })

  it('should strip existing (Copy) suffix from source name', () => {
    expect(generateCopyName('Day 1 (Copy)', ['Day 1 (Copy)'])).toBe('Day 1 (Copy 2)')
  })

  it('should strip existing (Copy N) suffix from source name', () => {
    expect(generateCopyName('Day 1 (Copy 3)', ['Day 1 (Copy 3)'])).toBe('Day 1 (Copy)')
  })

  it('should work with empty existing names', () => {
    expect(generateCopyName('Upper Power', [])).toBe('Upper Power (Copy)')
  })

  it('should handle names with special characters', () => {
    expect(generateCopyName('Push/Pull A', ['Push/Pull A'])).toBe('Push/Pull A (Copy)')
  })
})
