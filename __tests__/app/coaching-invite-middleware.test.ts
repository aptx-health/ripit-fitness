// @vitest-environment node
/**
 * Coaching slice 1 (features/coaching/invite-link.feature, "Accept after signing
 * up / in"): a signed-out visitor can open an invite link. The middleware sends
 * signed-out visitors to /login for every protected path, which would drop the
 * invite, so /coach/invite/* must be let through (the page itself offers Sign up
 * and Sign in). Everything else stays protected.
 *
 * Seam: lib/auth/middleware.ts, updateSession(request) (existing). Runs in node
 * because NextResponse.next({ request }) needs node's Headers.
 */

import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { updateSession } from '@/lib/auth/middleware'

const signedOut = (path: string) => updateSession(new NextRequest(`http://localhost${path}`))
const signedIn = (path: string) =>
  updateSession(new NextRequest(`http://localhost${path}`, { headers: { cookie: 'better-auth.session_token=abc' } }))

describe('Invite links open signed out', () => {
  it.each(['/coach/invite/abc123', '/coach/invite/abc_DEF-123?x=1'])('signed out, %s is not redirected', async (p) => {
    expect((await signedOut(p)).headers.get('location')).toBeNull()
  })

  it('signed in, an invite link is not redirected either', async () => {
    expect((await signedIn('/coach/invite/abc123')).headers.get('location')).toBeNull()
  })
})

describe('Everything else stays protected', () => {
  it.each(['/coaching', '/coach', '/coach/other', '/coach/inviteX', '/settings/coaching', '/'])(
    'signed out, %s is sent to /login',
    async (p) => {
      const location = (await signedOut(p)).headers.get('location')
      expect(location && new URL(location).pathname).toBe('/login')
    },
  )
})
