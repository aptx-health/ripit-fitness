'use client'

import { useEffect } from 'react'
import { flushEvents, trackEvent } from '@/lib/analytics'
import { authClient } from '@/lib/auth-client'
import {
  clearAttribution,
  consumePendingOAuthSignup,
  resolveSource,
} from '@/lib/signup-attribution'

/**
 * Fires the `signup_completed` AppEvent once an OAuth signup completes.
 *
 * Email signups already fire `signup_completed` from the signup form. OAuth
 * signups round-trip through the provider and land on `/`, so we drop a
 * "pending OAuth signup" record into sessionStorage at click-time and consume
 * it here once BetterAuth establishes a session.
 *
 * Guards against false positives:
 *  - Only fires when a pending record exists (set by OAuthButtons w/ intent=signup)
 *  - Verifies the user's createdAt is within 5 min so a returning OAuth user
 *    who happened to start a signup-intent click doesn't fire a duplicate event
 *  - Pending record is single-use (consumed atomically)
 */
const FRESH_SIGNUP_WINDOW_MS = 5 * 60 * 1000

export function SignupCompletedTracker() {
  // Read the session imperatively on mount rather than via the reactive
  // `useSession` hook. This is a fire-once side effect that renders nothing, so
  // it never needs to re-render on session changes — and calling BetterAuth's
  // render-phase hook here pulled its internal `useStore`/`useRef` into the
  // client boundary in a way that crashed with an invalid hook call on some
  // server-rendered routes (issue #971).
  useEffect(() => {
    let cancelled = false

    void authClient
      .getSession()
      .then(({ data }) => {
        if (cancelled) return

        const user = data?.user
        if (!user) return

        const pending = consumePendingOAuthSignup()
        if (!pending) return

        // Verify the account is genuinely new (avoids re-firing for repeat OAuth
        // sign-ins that the click handler can't distinguish from real signups).
        const createdAtMs = user.createdAt
          ? new Date(user.createdAt).getTime()
          : 0
        if (!createdAtMs || Date.now() - createdAtMs > FRESH_SIGNUP_WINDOW_MS) {
          return
        }

        const source = resolveSource(pending.method, pending.attribution)
        const props: Record<string, unknown> = {
          source,
          method: pending.method,
        }
        if (pending.attribution.gymSlug) {
          props.gymSlug = pending.attribution.gymSlug
        }
        trackEvent('signup_completed', props)
        clearAttribution()
        void flushEvents(true)
      })
      .catch(() => {
        // Session lookup failed — nothing to attribute, stay silent.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
