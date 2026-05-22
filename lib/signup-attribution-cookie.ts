/**
 * Server-shared shape for signup attribution carried via cookie across the
 * OAuth round-trip. The cookie is set by `POST /api/signup-attribution`
 * right before the user is sent to BetterAuth (email signup or OAuth), and
 * read by the `databaseHooks.user.create.after` hook to stamp the
 * `signup_completed` AppEvent.
 *
 * Cookies (unlike sessionStorage) survive OAuth top-level redirects across
 * storage partitions, in-app-browser → Safari handoffs, etc. — which is
 * exactly the path where the prior client-beacon approach was losing events.
 */

export const SIGNUP_ATTRIBUTION_COOKIE = "ripit_signup_attribution"

/** Cookie TTL: long enough for any plausible OAuth round-trip, short enough
 *  that a sign-in days later can't accidentally inherit a stale signup. */
export const SIGNUP_ATTRIBUTION_TTL_SECONDS = 30 * 60

export type SignupMethod = "email" | "google" | "discord"
export type SignupSource = "qr" | "organic" | "oauth"
export type QrMode = "beginner" | "experienced"

export interface SignupAttributionPayload {
  source: SignupSource
  method: SignupMethod
  gymSlug?: string
  mode?: QrMode
}

const ALLOWED_SOURCES = new Set<SignupSource>(["qr", "organic", "oauth"])
const ALLOWED_METHODS = new Set<SignupMethod>(["email", "google", "discord"])
const ALLOWED_MODES = new Set<QrMode>(["beginner", "experienced"])

export function isValidSignupAttribution(
  value: unknown
): value is SignupAttributionPayload {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  if (typeof v.source !== "string" || !ALLOWED_SOURCES.has(v.source as SignupSource)) {
    return false
  }
  if (typeof v.method !== "string" || !ALLOWED_METHODS.has(v.method as SignupMethod)) {
    return false
  }
  if (v.gymSlug !== undefined && (typeof v.gymSlug !== "string" || v.gymSlug.length > 100)) {
    return false
  }
  if (v.mode !== undefined && !ALLOWED_MODES.has(v.mode as QrMode)) {
    return false
  }
  return true
}

export function encodeSignupAttribution(
  payload: SignupAttributionPayload
): string {
  return encodeURIComponent(JSON.stringify(payload))
}

export function decodeSignupAttribution(
  raw: string
): SignupAttributionPayload | null {
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as unknown
    if (!isValidSignupAttribution(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Parse a raw `Cookie` request header and pull out the signup attribution
 * payload if present and valid. Returns null for any malformed input.
 */
export function readSignupAttributionFromHeader(
  cookieHeader: string | null
): SignupAttributionPayload | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(";")
  for (const part of cookies) {
    const eq = part.indexOf("=")
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    if (name !== SIGNUP_ATTRIBUTION_COOKIE) continue
    const value = part.slice(eq + 1).trim()
    return decodeSignupAttribution(value)
  }
  return null
}
