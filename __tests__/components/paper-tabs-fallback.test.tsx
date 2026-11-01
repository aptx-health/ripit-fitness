/**
 * Review 063 finding 2: when the page's `value` matches no tab (a stale ?tab=,
 * or before the page has chosen), the first tab stays in the tab order, so
 * keyboard users can still reach the strip. Nothing shows as selected.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PaperTabs from '@/components/ui/PaperTabs'

const TABS = [
  { id: 'workouts', label: 'Workouts' },
  { id: 'programs', label: 'Programs' },
]

afterEach(cleanup)

describe('Paper tabs with a value that matches no tab', () => {
  it('puts the first tab in the tab order', () => {
    render(<PaperTabs name="Library" idPrefix="lib" tone="mine" tabs={TABS} value="gone" onChange={vi.fn()} />)
    const [first, second] = screen.getAllByRole('tab')
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)
  })

  it('selects nothing', () => {
    render(<PaperTabs name="Library" idPrefix="lib" tone="mine" tabs={TABS} value="gone" onChange={vi.fn()} />)
    for (const tab of screen.getAllByRole('tab')) expect(tab.getAttribute('aria-selected')).toBe('false')
  })

  it('still uses the selected tab when value matches', () => {
    render(<PaperTabs name="Library" idPrefix="lib" tone="mine" tabs={TABS} value="programs" onChange={vi.fn()} />)
    const [first, second] = screen.getAllByRole('tab')
    expect(first.tabIndex).toBe(-1)
    expect(second.tabIndex).toBe(0)
  })
})
