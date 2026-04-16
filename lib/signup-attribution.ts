/**
 * Signup attribution helpers.
 *
 * Tracks where a signup originated:
 *  - `source: 'qr'`       — user arrived via /go/[gymSlug] QR code
 *  - `source: 'organic'`  — user arrived directly (no attribution)
 *  - `source: 'oauth'`    — user signed up via a social provider
 *
 * Attribution lives in `sessionStorage` so it survives in-app navigation
 * (e.g., /go → /signup) without polluting cookies or the URL.
 *
 * For OAuth signups the user round-trips through the provider and lands
 * on `/`. To detect that as a signup_completed event we stash a small
 * "pending OAuth signup" record before redirecting; the in-app tracker
 * picks it up after the session is established.
 */

'use client'

export type SignupSource = 'qr' | 'organic' | 'oauth'
export type SignupMethod = 'email' | 'google' | 'discord'

export interface SignupAttribution {
  source: SignupSource
  gymSlug?: string
}

export interface PendingOAuthSignup {
  method: 'google' | 'discord'
  attribution: SignupAttribution
  /** Unix ms timestamp; tracker drops anything older than 30 min. */
  startedAt: number
}

const ATTRIBUTION_KEY = 'ripit:signup-attribution'
const PENDING_OAUTH_KEY = 'ripit:pending-oauth-signup'

/** Maximum age of a pending OAuth signup before we discard it. */
const PENDING_OAUTH_TTL_MS = 30 * 60 * 1000

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function setAttribution(attribution: SignupAttribution): void {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  } catch {
    // sessionStorage can throw in private browsing / quota errors — best effort
  }
}

export function getAttribution(): SignupAttribution {
  if (!isBrowser()) return { source: 'organic' }
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY)
    if (!raw) return { source: 'organic' }
    const parsed = JSON.parse(raw) as SignupAttribution
    if (parsed.source !== 'qr' && parsed.source !== 'organic' && parsed.source !== 'oauth') {
      return { source: 'organic' }
    }
    return parsed
  } catch {
    return { source: 'organic' }
  }
}

export function clearAttribution(): void {
  if (!isBrowser()) return
  try {
    window.sessionStorage.removeItem(ATTRIBUTION_KEY)
  } catch {
    // ignore
  }
}

export function setPendingOAuthSignup(
  method: 'google' | 'discord',
  attribution: SignupAttribution
): void {
  if (!isBrowser()) return
  const record: PendingOAuthSignup = {
    method,
    attribution,
    startedAt: Date.now(),
  }
  try {
    window.sessionStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify(record))
  } catch {
    // ignore
  }
}

export function consumePendingOAuthSignup(): PendingOAuthSignup | null {
  if (!isBrowser()) return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_OAUTH_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(PENDING_OAUTH_KEY)
    const parsed = JSON.parse(raw) as PendingOAuthSignup
    if (!parsed || typeof parsed.startedAt !== 'number') return null
    if (Date.now() - parsed.startedAt > PENDING_OAUTH_TTL_MS) return null
    if (parsed.method !== 'google' && parsed.method !== 'discord') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Compute the canonical `source` from a method + attribution. Centralised
 * so client and server agree on the rule.
 *
 * Rule:
 *  - non-email method → `oauth` (overrides prior attribution)
 *  - email + gymSlug attribution → `qr`
 *  - otherwise → existing source (or `organic`)
 */
export function resolveSource(
  method: SignupMethod,
  attribution: SignupAttribution
): SignupSource {
  if (method !== 'email') return 'oauth'
  if (attribution.gymSlug) return 'qr'
  return attribution.source ?? 'organic'
}
