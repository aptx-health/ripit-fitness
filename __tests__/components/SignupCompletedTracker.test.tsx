import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { trackEvent, flushEvents, getSession } = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  flushEvents: vi.fn(() => Promise.resolve()),
  getSession: vi.fn(),
}))

// Mock the analytics layer so we can assert on emitted events without a network.
vi.mock('@/lib/analytics', () => ({ trackEvent, flushEvents }))

// Mock BetterAuth's client so the tracker never calls a render-phase hook.
// getSession is the imperative API the tracker relies on (issue #971).
vi.mock('@/lib/auth-client', () => ({ authClient: { getSession } }))

import { SignupCompletedTracker } from '@/components/features/SignupCompletedTracker'
import { setPendingOAuthSignup } from '@/lib/signup-attribution'

function sessionResult(createdAt: Date | null) {
  return {
    data: createdAt
      ? { user: { id: 'u1', email: 'a@b.com', createdAt } }
      : null,
    error: null,
  }
}

describe('SignupCompletedTracker', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    trackEvent.mockClear()
    flushEvents.mockClear()
    getSession.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without throwing an invalid hook call', () => {
    getSession.mockResolvedValue(sessionResult(null))
    // The whole point of #971: mounting must not crash.
    expect(() => render(<SignupCompletedTracker />)).not.toThrow()
  })

  it('fires signup_completed for a fresh OAuth session with a pending record', async () => {
    getSession.mockResolvedValue(sessionResult(new Date()))
    setPendingOAuthSignup('google', { source: 'oauth' })

    render(<SignupCompletedTracker />)

    await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(1))
    expect(trackEvent).toHaveBeenCalledWith('signup_completed', {
      source: 'oauth',
      method: 'google',
    })
    expect(flushEvents).toHaveBeenCalled()
  })

  it('does not fire when there is no pending OAuth record', async () => {
    getSession.mockResolvedValue(sessionResult(new Date()))

    render(<SignupCompletedTracker />)

    await waitFor(() => expect(getSession).toHaveBeenCalled())
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('does not fire when there is no session', async () => {
    getSession.mockResolvedValue(sessionResult(null))
    setPendingOAuthSignup('google', { source: 'oauth' })

    render(<SignupCompletedTracker />)

    await waitFor(() => expect(getSession).toHaveBeenCalled())
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('does not fire for a stale account outside the fresh-signup window', async () => {
    const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000)
    getSession.mockResolvedValue(sessionResult(eightMinutesAgo))
    setPendingOAuthSignup('google', { source: 'oauth' })

    render(<SignupCompletedTracker />)

    await waitFor(() => expect(getSession).toHaveBeenCalled())
    expect(trackEvent).not.toHaveBeenCalled()
  })
})
