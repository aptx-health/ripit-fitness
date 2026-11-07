/**
 * The waiver's ?next= (coaching slice 1, work/138): onboarding sends a new user
 * to /waiver?next=<coach invite>, so after "I Agree" the waiver goes there. An
 * off-origin value must not turn the waiver into an open redirect.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ search: '', pushed: [] as string[] }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (to: string) => nav.pushed.push(to), refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import WaiverPage from '@/app/waiver/page'

async function agreeWith(next: string) {
  nav.search = `?next=${encodeURIComponent(next)}`
  render(<WaiverPage />)
  fireEvent.click(await screen.findByRole('button', { name: /i agree/i }))
  await waitFor(() => expect(nav.pushed).toHaveLength(1))
  return nav.pushed[0]
}

beforeEach(() => {
  nav.pushed.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Waiver return path', () => {
  it('goes on to a coach invite after agreeing', async () => {
    expect(await agreeWith('/coach/invite/abc_DEF-123')).toBe('/coach/invite/abc_DEF-123')
  })

  it('keeps a same-origin path with a query', async () => {
    expect(await agreeWith('/programs/p1?expand=first')).toBe('/programs/p1?expand=first')
  })

  // Dotless hosts slipped past the old pattern: //2130706433 is 127.0.0.1, //intranet a LAN host.
  it.each(['//2130706433', '//intranet/x', '//evil.com', '//evil.com/coach/invite/x', 'https://evil.com/x', '/\\evil.com', 'javascript:alert(1)', ''])(
    'ignores next=%s and goes home',
    async (next) => {
      expect(await agreeWith(next)).toBe('/')
    }
  )
})
