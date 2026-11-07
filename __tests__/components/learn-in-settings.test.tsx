/**
 * Work item 135: Learn is found from Settings. The Help block's first row links
 * to /learn, and /learn has the shared "← Settings" back header.
 */

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LearnBrowser from '@/components/features/learn/LearnBrowser'
import HelpBlock from '@/components/settings/HelpBlock'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Help block', () => {
  it('starts with a 48px Learn row that links to /learn', () => {
    render(<HelpBlock />)
    const learn = screen.getByRole('link', { name: /learn/i })
    expect(learn.getAttribute('href')).toBe('/learn')
    expect(learn.className).toContain('min-h-12')
    expect(within(learn).getByText('Articles and guides')).toBeTruthy()
    const first = screen.getByRole('link', { name: /learn/i }).parentElement?.firstElementChild
    expect(first).toBe(learn)
  })
})

describe('Learn page', () => {
  it('has the shared back link to Settings above the LEARN title', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ articles: [], tags: [], collections: [] }), { status: 200 })),
    )
    render(<LearnBrowser />)
    const back = screen.getByRole('link', { name: /settings/i })
    expect(back.getAttribute('href')).toBe('/settings')
    expect(back.className).toContain('min-h-12')
    const title = screen.getByRole('heading', { level: 1, name: /learn/i })
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
